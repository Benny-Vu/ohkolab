/**
 * Test-only helpers for the push layer tests: a fake Supabase client that
 * records every query chain (select/eq/maybeSingle and upsert) and resolves
 * per table. Nothing in the app imports this file.
 */

import type { AppSupabaseClient } from "@/lib/supabase";

/** Everything one fake query chain did, for assertions. */
export interface PushChainRecord {
  table: string;
  selectColumns: string | null;
  eqFilters: Array<[string, unknown]>;
  upsertValues: Record<string, unknown> | null;
  isMaybeSingle: boolean;
}

/** What a fake chain resolves with. */
export interface PushFakeResult {
  data?: unknown;
  error?: unknown;
}

/** One recorded `rpc(name, args)` call, for assertions. */
export interface PushRpcRecord {
  fn: string;
  args: Record<string, unknown>;
}

export interface FakePushClient {
  client: AppSupabaseClient;
  records: PushChainRecord[];
  rpcCalls: PushRpcRecord[];
}

interface ChainNode {
  select(columns?: string): ChainNode;
  eq(column: string, value: unknown): ChainNode;
  maybeSingle(): ChainNode;
  upsert(values: Record<string, unknown>): ChainNode;
  delete(): ChainNode;
  then(
    onFulfilled?: (value: PushFakeResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ): Promise<unknown>;
}

/**
 * A fake client: every chain is recorded and resolved through `resolve`.
 * `upsert` chains (token and settings writes) resolve with
 * `{ data: null, error: null }` unless `resolve` says otherwise.
 */
export function createFakePushClient(
  resolve: (record: PushChainRecord) => PushFakeResult = () => ({
    data: null,
    error: null,
  }),
  resolveRpc: (record: PushRpcRecord) => PushFakeResult = () => ({
    data: null,
    error: null,
  }),
): FakePushClient {
  const records: PushChainRecord[] = [];
  const rpcCalls: PushRpcRecord[] = [];

  function makeNode(record: PushChainRecord): ChainNode {
    const node: ChainNode = {
      select(columns) {
        record.selectColumns = columns ?? null;
        return node;
      },
      eq(column, value) {
        record.eqFilters.push([column, value]);
        return node;
      },
      maybeSingle() {
        record.isMaybeSingle = true;
        return node;
      },
      upsert(values) {
        record.upsertValues = values;
        return node;
      },
      delete() {
        return node;
      },
      then(onFulfilled, onRejected) {
        records.push(record);
        return Promise.resolve(resolve(record)).then(
          onFulfilled,
          onRejected,
        ) as Promise<unknown>;
      },
    };
    return node;
  }

  const client = {
    from(table: string) {
      return makeNode({
        table,
        selectColumns: null,
        eqFilters: [],
        upsertValues: null,
        isMaybeSingle: false,
      });
    },
    rpc(fn: string, args: Record<string, unknown>) {
      const record = { fn, args };
      rpcCalls.push(record);
      return Promise.resolve(resolveRpc(record));
    },
  } as unknown as AppSupabaseClient;

  return { client, records, rpcCalls };
}
