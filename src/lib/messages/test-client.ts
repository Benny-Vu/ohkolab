/**
 * Test-only helpers for the direct message layer: a fake Supabase client that
 * records every query chain, rpc call and Realtime channel, plus the React
 * wrappers the hooks need. Modeled on `@/lib/social/test-client` but with
 * `gt`/`neq` and `channel` support, which the message queries and the
 * realtime wiring use. Nothing in the app imports this file.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
  type UseMutationResult,
} from "@tanstack/react-query";
import { expect } from "vitest";

import type { AuthContextValue } from "@/lib/auth/types";
import { AuthContext, GUEST_AUTH } from "@/lib/auth/use-auth";
import type { AppSupabaseClient } from "@/lib/supabase";
import type {
  SocialErrorCode,
  SocialFailure,
  SocialResult,
} from "@/lib/social/errors";

/** Everything one fake query chain did, for assertions. */
export interface ChainRecord {
  table: string;
  selectColumns: string | null;
  eqFilters: Array<[string, unknown]>;
  orFilters: string[];
  inFilters: Array<[string, unknown[]]>;
  isFilters: Array<[string, unknown]>;
  orders: Array<[string, { ascending: boolean }]>;
  limitCount: number | null;
  insertValues: unknown[] | null;
  updateValues: Record<string, unknown> | null;
  isSingle: boolean;
  isMaybeSingle: boolean;
}

/** What a fake chain or rpc call resolves with. */
export interface FakeResult {
  data?: unknown;
  error?: unknown;
}

/** One Realtime subscription, for assertions. */
export interface ChannelRecord {
  name: string;
  events: string[];
  filters: string[];
  subscribed: boolean;
  removed: boolean;
}

export interface FakeClient {
  client: AppSupabaseClient;
  records: ChainRecord[];
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> | undefined }>;
  channels: ChannelRecord[];
}

export interface FakeClientConfig {
  /** Result per table for the simple cases. */
  tables?: Record<string, FakeResult>;
  /** Full control: called whenever a chain is awaited. */
  resolve?: (record: ChainRecord) => FakeResult;
  /** Results for rpc calls, by function name. */
  rpc?: Record<string, FakeResult>;
}

export function createFakeClient(config: FakeClientConfig = {}): FakeClient {
  const records: ChainRecord[] = [];
  const rpcCalls: Array<{
    fn: string;
    args: Record<string, unknown> | undefined;
  }> = [];
  const channels: ChannelRecord[] = [];
  const channelObjects = new Map<
    string,
    {
      topic: string;
      on: (
        event: string,
        options: { table?: string; filter?: string },
        callback: (payload: { new: Record<string, unknown> }) => void,
      ) => unknown;
      subscribe: () => unknown;
      callbacks: Array<(payload: { new: Record<string, unknown> }) => void>;
    }
  >();
  const resolve =
    config.resolve ??
    ((record: ChainRecord) =>
      config.tables?.[record.table] ?? { data: [], error: null });

  const makeNode = (record: ChainRecord) => {
    const node = {
      select(columns?: string) {
        record.selectColumns = columns ?? null;
        return node;
      },
      eq(column: string, value: unknown) {
        record.eqFilters.push([column, value]);
        return node;
      },
      or(filter: string) {
        record.orFilters.push(filter);
        return node;
      },
      in(column: string, values: unknown[]) {
        record.inFilters.push([column, values]);
        return node;
      },
      is(column: string, value: unknown) {
        record.isFilters.push([column, value]);
        return node;
      },
      order(column: string, options: { ascending: boolean }) {
        record.orders.push([column, options]);
        return node;
      },
      limit(count: number) {
        record.limitCount = count;
        return node;
      },
      insert(values: unknown) {
        record.insertValues = Array.isArray(values) ? values : [values];
        return node;
      },
      update(values: Record<string, unknown>) {
        record.updateValues = values;
        return node;
      },
      single() {
        record.isSingle = true;
        return node;
      },
      maybeSingle() {
        record.isMaybeSingle = true;
        return node;
      },
      then(
        onFulfilled?: (value: FakeResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ): Promise<unknown> {
        return Promise.resolve(resolve(record)).then(onFulfilled, onRejected);
      },
    };
    return node;
  };
  interface ChainNode {
    select(columns?: string): ChainNode;
    eq(column: string, value: unknown): ChainNode;
    or(filter: string): ChainNode;
    in(column: string, values: unknown[]): ChainNode;
    is(column: string, value: unknown): ChainNode;
    order(column: string, options: { ascending: boolean }): ChainNode;
    limit(count: number): ChainNode;
    insert(values: unknown): ChainNode;
    update(values: Record<string, unknown>): ChainNode;
    single(): ChainNode;
    maybeSingle(): ChainNode;
    then(
      onFulfilled?: (value: FakeResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ): Promise<unknown>;
  }

  const client = {
    from(table: string): ChainNode {
      const record: ChainRecord = {
        table,
        selectColumns: null,
        eqFilters: [],
        orFilters: [],
        inFilters: [],
        isFilters: [],
        orders: [],
        limitCount: null,
        insertValues: null,
        updateValues: null,
        isSingle: false,
        isMaybeSingle: false,
      };
      records.push(record);
      return makeNode(record);
    },
    rpc(fn: string, args?: Record<string, unknown>): Promise<FakeResult> {
      rpcCalls.push({ fn, args });
      return Promise.resolve(config.rpc?.[fn] ?? { data: null, error: null });
    },
    channel(name: string) {
      // One channel per name, like the real client: a repeated call (also
      // from tests delivering events) returns the same object with its
      // registered listeners.
      const existing = channelObjects.get(name);
      if (existing) {
        return existing;
      }
      const record: ChannelRecord = {
        name,
        events: [],
        filters: [],
        subscribed: false,
        removed: false,
      };
      channels.push(record);
      const channel = {
        // The real channel's name; lets removeChannel find its record.
        topic: name,
        on(
          event: string,
          options: { table?: string; filter?: string },
          callback: (payload: { new: Record<string, unknown> }) => void,
        ) {
          record.events.push(event);
          if (options.filter) record.filters.push(options.filter);
          channel.callbacks.push(callback);
          return channel;
        },
        subscribe() {
          record.subscribed = true;
          return channel;
        },
        // Test-only helper: the fake delivers events through here.
        callbacks: [] as Array<
          (payload: { new: Record<string, unknown> }) => void
        >,
      };
      channelObjects.set(name, channel);
      return channel;
    },
    removeChannel(channel: unknown) {
      const topic = (channel as unknown as { topic?: string }).topic;
      const target = channels.find((candidate) => candidate.name === topic);
      if (target) target.removed = true;
      return Promise.resolve("ok");
    },
  };

  return {
    client: client as unknown as AppSupabaseClient,
    records,
    rpcCalls,
    channels,
  };
}

/**
 * Delivers a fake Realtime INSERT to every listener of the named channel, the
 * way the server would. Use the channel name the code passed to
 * `client.channel(...)`.
 */
export function emitFakeMessage(
  fake: FakeClient,
  channelName: string,
  row: Record<string, unknown>,
): void {
  const channel = (
    fake.client as unknown as {
      channel: (name: string) => {
        callbacks: Array<(payload: { new: Record<string, unknown> }) => void>;
      };
    }
  ).channel(channelName);
  for (const callback of channel.callbacks) {
    callback({ new: row });
  }
}

/** A fresh query client with retries off, one per test. */
export function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** Wraps hooks in the auth context and query client provider they need. */
export function createWrapper(
  queryClient: QueryClient,
  auth: AuthContextValue = GUEST_AUTH,
) {
  return function MessagesTestWrapper({ children }: { children?: ReactNode }) {
    return createElement(
      AuthContext.Provider,
      { value: auth },
      createElement(QueryClientProvider, { client: queryClient }, children),
    );
  };
}

/** A signed-in user with id "user-1" for the auth context. */
export const SIGNED_IN_AUTH: AuthContextValue = {
  ...GUEST_AUTH,
  isConfigured: true,
  user: { id: "user-1" } as unknown as AuthContextValue["user"],
};

/** Renders a mutation hook, runs it once and returns its SocialResult. */
export async function runMutation<TVars, TData>(
  useHook: (
    client?: AppSupabaseClient | null,
  ) => UseMutationResult<SocialResult<TData>, SocialFailure, TVars>,
  variables: NoInfer<TVars>,
  options: {
    client?: AppSupabaseClient | null;
    auth?: AuthContextValue;
    queryClient?: QueryClient;
  } = {},
): Promise<SocialResult<TData> | undefined> {
  const queryClient = options.queryClient ?? createQueryClient();
  const { result } = renderHook(() => useHook(options.client ?? null), {
    wrapper: createWrapper(queryClient, options.auth ?? SIGNED_IN_AUTH),
  });
  let resolved: SocialResult<TData> | undefined;
  act(() => {
    void result.current.mutateAsync(variables).then((value) => {
      resolved = value;
    });
  });
  await waitFor(() => expect(resolved).toBeDefined());
  await waitFor(() => expect(result.current.data).toBeDefined());
  return result.current.data;
}

/** Asserts a mutation result failed with the given code (and message). */
export function expectFailed(
  result: SocialResult<unknown> | undefined,
  code: SocialErrorCode,
  message?: string,
): void {
  expect(result).toBeDefined();
  if (result === undefined || result.ok) {
    throw new Error("expected the mutation to fail");
  }
  expect(result.error.code).toBe(code);
  if (message !== undefined) {
    expect(result.error.message).toBe(message);
  }
}
