/**
 * Test-only helpers for the groups layer tests: a fake Supabase client that
 * records every query chain and rpc call, the React wrappers the hooks need,
 * and shared row factories. Modeled on `@/lib/social/test-client` but with
 * `ilike` support for the Discover search. Nothing in the app imports this
 * file.
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
import type {
  GroupMemberRow,
  GroupRow,
  ProfileRow,
} from "@/lib/database.types";
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
  ilikeFilters: Array<[string, string]>;
  inFilters: Array<[string, unknown[]]>;
  isFilters: Array<[string, unknown]>;
  orders: Array<[string, { ascending: boolean }]>;
  limitCount: number | null;
  insertValues: unknown[] | null;
  updateValues: Record<string, unknown> | null;
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

/** A chain node: every method keeps the chain alive; awaiting resolves it. */
interface ChainNode {
  select(columns?: string, options?: Record<string, unknown>): ChainNode;
  eq(column: string, value: unknown): ChainNode;
  ilike(column: string, pattern: string): ChainNode;
  in(column: string, values: unknown[]): ChainNode;
  is(column: string, value: unknown): ChainNode;
  order(column: string, options: { ascending: boolean }): ChainNode;
  limit(count: number): ChainNode;
  insert(values: unknown): ChainNode;
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
  const resolve =
    config.resolve ??
    ((record: ChainRecord) =>
      config.tables?.[record.table] ?? { data: [], error: null });

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
        ilikeFilters: [],
        inFilters: [],
        isFilters: [],
        orders: [],
        limitCount: null,
        insertValues: null,
        updateValues: null,
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
  };

  return { client: client as unknown as AppSupabaseClient, records, rpcCalls };
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
  return function GroupsTestWrapper({ children }: { children?: ReactNode }) {
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

export function groupRow(
  partial: Partial<GroupRow> & { id: string },
): GroupRow {
  return {
    slug: "test-group",
    name: "Test Group",
    description: "A group for testing.",
    visibility: "public",
    owner_id: "user-1",
    created_at: "2026-11-18T10:00:00.000Z",
    updated_at: "2026-11-18T10:00:00.000Z",
    ...partial,
  };
}

export function groupMemberRow(
  partial: Partial<GroupMemberRow> & {
    groupId: string;
    userId: string;
  },
): GroupMemberRow {
  return {
    group_id: partial.groupId,
    user_id: partial.userId,
    role: "member",
    status: "active",
    created_at: "2026-11-18T10:00:00.000Z",
    ...partial,
  };
}

export function profileRow(
  partial: Partial<ProfileRow> & { id: string },
): ProfileRow {
  return {
    username: "trainer",
    display_name: "Trainer",
    avatar_species: "Garchomp",
    bio: null,
    created_at: "2026-11-17T10:00:00.000Z",
    updated_at: "2026-11-17T10:00:00.000Z",
    ...partial,
  };
}
