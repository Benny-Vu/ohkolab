/**
 * Test-only helpers for the social layer tests: a fake Supabase client that
 * records every query chain and rpc call, the React wrappers the hooks need,
 * and shared row factories. Nothing in the app imports this file.
 */

import { act, renderHook } from "@testing-library/react";
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
  CommentRow,
  FeedPostRow,
  PostRow,
  ReportRow,
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
  orFilters: string[];
  inFilters: Array<[string, unknown[]]>;
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
  or(filter: string): ChainNode;
  in(column: string, values: unknown[]): ChainNode;
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
      or(filter) {
        record.orFilters.push(filter);
        return node;
      },
      in(column, values) {
        record.inFilters.push([column, values]);
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
        orFilters: [],
        inFilters: [],
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
  return function SocialTestWrapper({ children }: { children?: ReactNode }) {
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
  useHook: () => UseMutationResult<SocialResult<TData>, SocialFailure, TVars>,
  variables: TVars,
  options: { auth?: AuthContextValue; queryClient?: QueryClient } = {},
): Promise<SocialResult<TData> | undefined> {
  const queryClient = options.queryClient ?? createQueryClient();
  const { result } = renderHook(useHook, {
    wrapper: createWrapper(queryClient, options.auth ?? SIGNED_IN_AUTH),
  });
  await act(async () => {
    await result.current.mutateAsync(variables);
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

export function feedRow(
  partial: Partial<FeedPostRow> & { id: string },
): FeedPostRow {
  return {
    author_id: "user-1",
    body: "Hello",
    attachment: null,
    created_at: "2026-11-17T10:00:00.000Z",
    updated_at: "2026-11-17T10:00:00.000Z",
    author_username: "tester",
    author_display_name: "Test User",
    author_avatar_species: "Garchomp",
    like_count: 2,
    comment_count: 1,
    liked_by_me: false,
    ...partial,
  };
}

export function postRow(partial: Partial<PostRow> & { id: string }): PostRow {
  return {
    author_id: "user-1",
    body: "Hello",
    attachment: null,
    created_at: "2026-11-17T10:00:00.000Z",
    updated_at: "2026-11-17T10:00:00.000Z",
    removed_at: null,
    removed_by: null,
    ...partial,
  };
}

export function commentRow(
  partial: Partial<CommentRow> & { id: string },
): CommentRow {
  return {
    post_id: "post-1",
    author_id: "user-2",
    body: "Nice",
    created_at: "2026-11-17T10:05:00.000Z",
    removed_at: null,
    removed_by: null,
    ...partial,
  };
}

export function reportRow(
  partial: Partial<ReportRow> & { id: string },
): ReportRow {
  return {
    reporter_id: "user-2",
    target_type: "post",
    target_id: "post-1",
    reason: "spam",
    details: null,
    status: "open",
    created_at: "2026-11-17T10:00:00.000Z",
    handled_by: null,
    handled_at: null,
    ...partial,
  };
}
