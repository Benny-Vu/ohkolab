/**
 * The one fake Supabase client for tests: a query builder that records every
 * chain (select/eq/or/ilike/in/is/order/limit/insert/update/upsert/delete/
 * single/maybeSingle), plus rpc, storage uploads, edge-function invokes and
 * Realtime channels, and the React wrappers the data-layer hook tests share.
 * Every feature layer's test-client re-exports from here. Nothing in the
 * app imports this file.
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
  selectOptions: Record<string, unknown> | null;
  eqFilters: Array<[string, unknown]>;
  orFilters: string[];
  ilikeFilters: Array<[string, string]>;
  inFilters: Array<[string, unknown[]]>;
  isFilters: Array<[string, unknown]>;
  orders: Array<[string, { ascending: boolean }]>;
  limitCount: number | null;
  insertValues: unknown[] | null;
  updateValues: Record<string, unknown> | null;
  upsertValues: unknown[] | null;
  upsertOnConflict: string | null;
  isDelete: boolean;
  isSingle: boolean;
  isMaybeSingle: boolean;
}

/** What a fake chain or rpc call resolves with. */
export interface FakeResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

/** One storage.upload call, for assertions. */
interface StorageUploadRecord {
  bucket: string;
  path: string;
  body: unknown;
  options: Record<string, unknown> | undefined;
}

/** One functions.invoke call, for assertions. */
interface InvokeRecord {
  fn: string;
  options: { body?: unknown } | undefined;
}

/** One Realtime subscription, for assertions. */
interface ChannelRecord {
  name: string;
  events: string[];
  filters: string[];
  subscribed: boolean;
  removed: boolean;
}

/** A chain node: every method keeps the chain alive; awaiting resolves it. */
interface ChainNode {
  select(columns?: string, options?: Record<string, unknown>): ChainNode;
  eq(column: string, value: unknown): ChainNode;
  or(filter: string): ChainNode;
  ilike(column: string, pattern: string): ChainNode;
  in(column: string, values: unknown[]): ChainNode;
  is(column: string, value: unknown): ChainNode;
  order(column: string, options: { ascending: boolean }): ChainNode;
  limit(count: number): ChainNode;
  insert(values: unknown): ChainNode;
  upsert(values: unknown, options?: { onConflict?: string }): ChainNode;
  update(values: Record<string, unknown>): ChainNode;
  delete(): ChainNode;
  single(): ChainNode;
  maybeSingle(): ChainNode;
  then(
    onFulfilled?: (value: FakeResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ): Promise<unknown>;
}

export interface FakeClient {
  client: AppSupabaseClient;
  records: ChainRecord[];
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> | undefined }>;
  uploads: StorageUploadRecord[];
  invokes: InvokeRecord[];
  channels: ChannelRecord[];
}

export interface FakeClientConfig {
  /** Result per table for the simple cases. */
  tables?: Record<string, FakeResult>;
  /** Full control: called whenever a chain is awaited. */
  resolve?: (record: ChainRecord) => FakeResult;
  /** Results for rpc calls, by function name. */
  rpc?: Record<string, FakeResult>;
  /**
   * Results for storage uploads: per bucket, or one resolver for every
   * upload. Defaults to success.
   */
  storage?:
    Record<string, FakeResult> | ((record: StorageUploadRecord) => FakeResult);
  /** Results for functions.invoke calls, by function name. */
  functions?: Record<string, FakeResult>;
}

export function createFakeClient(config: FakeClientConfig = {}): FakeClient {
  const records: ChainRecord[] = [];
  const rpcCalls: Array<{
    fn: string;
    args: Record<string, unknown> | undefined;
  }> = [];
  const uploads: StorageUploadRecord[] = [];
  const invokes: InvokeRecord[] = [];
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
      // Test-only helper: the fake delivers events through here.
      callbacks: Array<(payload: { new: Record<string, unknown> }) => void>;
    }
  >();
  const resolve =
    config.resolve ??
    ((record: ChainRecord) =>
      config.tables?.[record.table] ?? { data: [], error: null });
  const resolveUpload = (record: StorageUploadRecord): FakeResult => {
    if (typeof config.storage === "function") {
      return config.storage(record);
    }
    return (
      config.storage?.[record.bucket] ?? {
        data: { path: record.path },
        error: null,
      }
    );
  };

  const makeNode = (record: ChainRecord): ChainNode => {
    const node: ChainNode = {
      select(columns, options) {
        record.selectColumns = columns ?? null;
        record.selectOptions = options ?? null;
        return node;
      },
      eq(column, value) {
        record.eqFilters.push([column, value]);
        return node;
      },
      or(filter) {
        record.orFilters.push(filter);
        return node;
      },
      ilike(column, pattern) {
        record.ilikeFilters.push([column, pattern]);
        return node;
      },
      in(column, values) {
        record.inFilters.push([column, values]);
        return node;
      },
      is(column, value) {
        record.isFilters.push([column, value]);
        return node;
      },
      order(column, options) {
        record.orders.push([column, options]);
        return node;
      },
      limit(count) {
        record.limitCount = count;
        return node;
      },
      insert(values) {
        record.insertValues = Array.isArray(values) ? values : [values];
        return node;
      },
      upsert(values, options) {
        record.upsertValues = Array.isArray(values) ? values : [values];
        record.upsertOnConflict = options?.onConflict ?? null;
        return node;
      },
      update(values) {
        record.updateValues = values;
        return node;
      },
      delete() {
        record.isDelete = true;
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
      then(onFulfilled, onRejected) {
        return Promise.resolve(resolve(record)).then(onFulfilled, onRejected);
      },
    };
    return node;
  };

  const client = {
    from(table: string): ChainNode {
      const record: ChainRecord = {
        table,
        selectColumns: null,
        selectOptions: null,
        eqFilters: [],
        orFilters: [],
        ilikeFilters: [],
        inFilters: [],
        isFilters: [],
        orders: [],
        limitCount: null,
        insertValues: null,
        updateValues: null,
        upsertValues: null,
        upsertOnConflict: null,
        isDelete: false,
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
    storage: {
      from(bucket: string) {
        return {
          upload(
            path: string,
            body: unknown,
            options?: Record<string, unknown>,
          ): Promise<FakeResult> {
            const record: StorageUploadRecord = {
              bucket,
              path,
              body,
              options,
            };
            uploads.push(record);
            return Promise.resolve(resolveUpload(record));
          },
        };
      },
    },
    functions: {
      invoke(fn: string, options?: { body?: unknown }): Promise<FakeResult> {
        invokes.push({ fn, options });
        return Promise.resolve(
          config.functions?.[fn] ?? { data: null, error: null },
        );
      },
    },
  };

  return {
    client: client as unknown as AppSupabaseClient,
    records,
    rpcCalls,
    uploads,
    invokes,
    channels,
  };
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
  return function FakeSupabaseWrapper({ children }: { children?: ReactNode }) {
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
  // Generous timeout: mutations with internal retry backoffs can take
  // a second or two of real time before they resolve.
  await waitFor(() => expect(resolved).toBeDefined(), { timeout: 5000 });
  await waitFor(() => expect(result.current.data).toBeDefined(), {
    timeout: 5000,
  });
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
