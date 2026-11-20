import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";

import type { AppSupabaseClient } from "@/lib/supabase";
import {
  createFakeClient,
  createQueryClient,
  createWrapper,
  expectFailed,
  runMutation,
  SIGNED_IN_AUTH,
  type FakeClientConfig,
  type FakeResult,
} from "@/lib/messages/test-client";
import {
  useMarkConversationRead,
  useReportMessage,
  useSendMessage,
  useStartConversation,
  useUpdateMessageSetting,
  type ThreadMessage,
} from "@/lib/messages/mutations";
import type { ConversationSummary } from "@/lib/messages/logic";

const ME = "user-1";

function insertOk(): FakeClientConfig {
  return {
    resolve: (record) => {
      if (record.table === "messages" && record.insertValues) {
        const value = record.insertValues[0] as Record<string, unknown>;
        return {
          data: {
            id: "m-new",
            conversation_id: value.conversation_id,
            sender_id: value.sender_id,
            body: value.body,
            created_at: "2026-11-19T11:00:00+00:00",
            deleted_at: null,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    },
    rpc: {
      start_conversation: { data: "conv-1", error: null },
      report_message: { data: "report-1", error: null },
    },
  };
}

describe("message mutations with the flag off", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never touches the client, whichever mutation is called", async () => {
    const fake = createFakeClient(insertOk());
    const send = await runMutation(
      useSendMessage,
      {
        conversationId: "conv-1",
        body: "Hello",
      },
      { client: fake.client },
    );
    expectFailed(send, "not_configured");
    const start = await runMutation(useStartConversation, "user-2", {
      client: fake.client,
    });
    expectFailed(start, "not_configured");
    const mark = await runMutation(useMarkConversationRead, "conv-1", {
      client: fake.client,
    });
    expectFailed(mark, "not_configured");
    const report = await runMutation(
      useReportMessage,
      {
        messageId: "m1",
        reason: "spam",
      },
      { client: fake.client },
    );
    expectFailed(report, "not_configured");
    const setting = await runMutation(useUpdateMessageSetting, "nobody", {
      client: fake.client,
    });
    expectFailed(setting, "not_configured");
    expect(fake.records).toEqual([]);
    expect(fake.rpcCalls).toEqual([]);
  });
});

describe("message mutations with the flag on", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends a message and marks my own copy read", async () => {
    const fake = createFakeClient(insertOk());
    const result = await runMutation(
      useSendMessage,
      { conversationId: "conv-1", body: "  Hello  " },
      { client: fake.client },
    );
    expect(result?.ok).toBe(true);
    const insert = fake.records.find((record) => record.insertValues);
    expect(insert?.table).toBe("messages");
    expect(insert?.insertValues?.[0]).toMatchObject({
      conversation_id: "conv-1",
      sender_id: ME,
      body: "Hello",
    });
    const markRead = fake.records.find(
      (record) =>
        record.table === "conversation_participants" && record.updateValues,
    );
    expect(markRead?.updateValues?.last_read_at).toBeDefined();
  });

  it("rejects an empty body without touching the client", async () => {
    const fake = createFakeClient(insertOk());
    const result = await runMutation(
      useSendMessage,
      { conversationId: "conv-1", body: "   " },
      { client: fake.client },
    );
    expectFailed(result, "invalid_input");
    expect(fake.records).toEqual([]);
  });

  it("rejects a body over the server limit without touching the client", async () => {
    const fake = createFakeClient(insertOk());
    const result = await runMutation(
      useSendMessage,
      { conversationId: "conv-1", body: "a".repeat(2001) },
      { client: fake.client },
    );
    expectFailed(result, "too_long");
    expect(fake.records).toEqual([]);
  });

  it.each([
    ["P0A09", "rate_limited"],
    ["42501", "forbidden"],
    ["22001", "too_long"],
  ])("maps a send error %s to %s", async (code, expected) => {
    const failing = createFakeClient({
      resolve: (record) =>
        record.table === "messages" && record.insertValues
          ? { data: null, error: { code, message: "server says no" } }
          : { data: null, error: null },
      rpc: insertOk().rpc,
    });
    const result = await runMutation(
      useSendMessage,
      { conversationId: "conv-1", body: "Hello" },
      { client: failing.client },
    );
    expectFailed(result, expected as "rate_limited");
  });

  it("starts a conversation through the RPC", async () => {
    const fake = createFakeClient(insertOk());
    const result = await runMutation(useStartConversation, "user-2", {
      client: fake.client,
    });
    expect(result?.ok).toBe(true);
    expect(fake.rpcCalls).toEqual([
      { fn: "start_conversation", args: { other: "user-2" } },
    ]);
  });

  it("maps start_conversation failures to friendly codes", async () => {
    const fake = createFakeClient({
      rpc: {
        start_conversation: {
          data: null,
          error: { code: "P0A08", message: "Too many new conversations today" },
        },
      },
    });
    const result = await runMutation(useStartConversation, "user-2", {
      client: fake.client,
    });
    expectFailed(result, "rate_limited");
  });

  it("marks a conversation read by updating my own last_read_at", async () => {
    const fake = createFakeClient(insertOk());
    const result = await runMutation(useMarkConversationRead, "conv-1", {
      client: fake.client,
    });
    expect(result?.ok).toBe(true);
    const update = fake.records.find((record) => record.updateValues);
    expect(update?.table).toBe("conversation_participants");
    expect(update?.updateValues?.last_read_at).toBeDefined();
    expect(update?.eqFilters).toEqual([
      ["conversation_id", "conv-1"],
      ["user_id", ME],
    ]);
  });

  it("reports a message through the RPC with its reason", async () => {
    const fake = createFakeClient(insertOk());
    const result = await runMutation(
      useReportMessage,
      { messageId: "m1", reason: "harassment" },
      { client: fake.client },
    );
    expect(result?.ok).toBe(true);
    expect(fake.rpcCalls).toEqual([
      {
        fn: "report_message",
        args: { message_id: "m1", reason: "harassment" },
      },
    ]);
  });

  it("updates the who can message setting on my own row", async () => {
    const fake = createFakeClient(insertOk());
    const result = await runMutation(useUpdateMessageSetting, "nobody", {
      client: fake.client,
    });
    expect(result?.ok).toBe(true);
    const update = fake.records.find((record) => record.updateValues);
    expect(update?.table).toBe("message_settings");
    expect(update?.updateValues).toEqual({ who_can_message: "nobody" });
    expect(update?.eqFilters).toEqual([["user_id", ME]]);
  });
});

/**
 * A resolver whose every awaited chain resolves only when the test says so,
 * so the optimistic cache writes can be observed mid-flight.
 */
function deferredChains() {
  const gates: Array<(value: FakeResult) => void> = [];
  const config: FakeClientConfig = {
    resolve: () =>
      new Promise<FakeResult>((resolve) => {
        gates.push(resolve);
      }) as unknown as FakeResult,
  };
  return {
    config,
    async settle(index: number, value: FakeResult): Promise<void> {
      await waitFor(() => expect(gates.length).toBeGreaterThan(index));
      gates[index]!(value);
    },
  };
}

const CONV = "conv-1";
const THREAD_KEY = ["messages", "thread", CONV] as const;
const EXISTING: ThreadMessage = {
  id: "m1",
  conversation_id: CONV,
  sender_id: "user-2",
  body: "Hello",
  created_at: "2026-11-19T10:00:00+00:00",
  deleted_at: null,
};

/** Runs one mutation against its own query client, mid-flight observable. */
function begin<TVars>(
  useHook: (client?: AppSupabaseClient | null) => {
    mutateAsync: (variables: TVars) => Promise<unknown>;
  },
  variables: TVars,
  queryClient: QueryClient,
  client: AppSupabaseClient | null,
) {
  const hook = renderHook(() => useHook(client), {
    wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
  });
  let settled = false;
  act(() => {
    void hook.result.current.mutateAsync(variables).finally(() => {
      settled = true;
    });
  });
  return {
    hook,
    async done(): Promise<void> {
      await waitFor(() => expect(settled).toBe(true));
    },
  };
}

describe("message mutations, optimistic writes", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows the sent message as pending and swaps it for the server row", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    queryClient.setQueryData(THREAD_KEY, [EXISTING]);

    const run = begin(
      useSendMessage,
      { conversationId: CONV, body: "Hi" },
      queryClient,
      fake.client,
    );

    // The optimistic copy is in the thread before the insert resolves.
    let rows = queryClient.getQueryData<ThreadMessage[]>(THREAD_KEY);
    expect(rows).toHaveLength(2);
    expect(rows?.[1]).toMatchObject({
      conversation_id: CONV,
      sender_id: ME,
      body: "Hi",
      pending: true,
    });
    expect(rows?.[1]?.id).toMatch(/^local-/);

    await settle(0, {
      data: {
        id: "m-new",
        conversation_id: CONV,
        sender_id: ME,
        body: "Hi",
        created_at: "2026-11-19T11:00:00+00:00",
        deleted_at: null,
      },
      error: null,
    });
    await settle(1, { data: null, error: null });
    await run.done();

    rows = queryClient.getQueryData<ThreadMessage[]>(THREAD_KEY);
    expect(rows?.map((row) => row.id)).toEqual(["m1", "m-new"]);
    expect(
      rows?.every((row) => row.pending !== true && row.failed !== true),
    ).toBe(true);
  });

  it("keeps a failed send in the thread, flagged for retry", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    queryClient.setQueryData(THREAD_KEY, [EXISTING]);

    const run = begin(
      useSendMessage,
      { conversationId: CONV, body: "Hi" },
      queryClient,
      fake.client,
    );

    await settle(0, {
      data: null,
      error: { code: "P0A09", message: "Too many messages" },
    });
    await run.done();

    const rows = queryClient.getQueryData<ThreadMessage[]>(THREAD_KEY);
    expect(rows).toHaveLength(2);
    expect(rows?.[1]).toMatchObject({
      body: "Hi",
      failed: true,
      pending: false,
    });

    // Retrying the same body reuses the failed row instead of stacking.
    const retry = begin(
      useSendMessage,
      { conversationId: CONV, body: "Hi" },
      queryClient,
      fake.client,
    );
    await waitFor(() =>
      expect(
        queryClient.getQueryData<ThreadMessage[]>(THREAD_KEY),
      ).toHaveLength(2),
    );
    expect(
      queryClient.getQueryData<ThreadMessage[]>(THREAD_KEY)?.[1]?.pending,
    ).toBe(true);

    // The first send already consumed gate 0; the retry uses the next two.
    await settle(1, {
      data: {
        id: "m-retry",
        conversation_id: CONV,
        sender_id: ME,
        body: "Hi",
        created_at: "2026-11-19T11:01:00+00:00",
        deleted_at: null,
      },
      error: null,
    });
    await settle(2, { data: null, error: null });
    await retry.done();

    expect(
      queryClient
        .getQueryData<ThreadMessage[]>(THREAD_KEY)
        ?.map((row) => row.id),
    ).toEqual(["m1", "m-retry"]);
  });

  it("adds no optimistic row for a body that cannot be sent", async () => {
    const fake = createFakeClient();
    const queryClient = createQueryClient();
    queryClient.setQueryData(THREAD_KEY, [EXISTING]);

    const run = begin(
      useSendMessage,
      { conversationId: CONV, body: "   " },
      queryClient,
      fake.client,
    );

    await run.done();
    expect(queryClient.getQueryData<ThreadMessage[]>(THREAD_KEY)).toEqual([
      EXISTING,
    ]);
  });

  it("marks a conversation read in the cache before the server answers", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    const summaries: ConversationSummary[] = [
      {
        id: CONV,
        otherUserId: "user-2",
        otherUsername: "brock",
        otherDisplayName: null,
        otherAvatarSpecies: null,
        lastReadAt: "2026-11-19T10:00:00+00:00",
        closedAt: null,
        unread: 2,
        lastActivityAt: "2026-11-19T10:30:00+00:00",
        lastMessage: {
          body: "Hello",
          fromMe: false,
          createdAt: "2026-11-19T10:30:00+00:00",
        },
      },
    ];
    queryClient.setQueryData(["messages", "conversations", ME], summaries);
    queryClient.setQueryData(["messages", "unread-count", ME], 2);

    const run = begin(useMarkConversationRead, CONV, queryClient, fake.client);

    const cached = queryClient.getQueryData<ConversationSummary[]>([
      "messages",
      "conversations",
      ME,
    ]);
    expect(cached?.[0]).toMatchObject({ unread: 0 });
    expect(cached?.[0]?.lastReadAt).not.toBe("2026-11-19T10:00:00+00:00");
    expect(queryClient.getQueryData(["messages", "unread-count", ME])).toBe(0);

    await settle(0, { data: null, error: { code: "42501", message: "no" } });
    await run.done();

    // The server refused: the unread markers come back.
    expect(
      queryClient.getQueryData<ConversationSummary[]>([
        "messages",
        "conversations",
        ME,
      ]),
    ).toEqual(summaries);
    expect(queryClient.getQueryData(["messages", "unread-count", ME])).toBe(2);
  });

  it("flips the who-can-message setting optimistically and rolls it back", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    queryClient.setQueryData(["messages", "setting", ME], "friends");

    const run = begin(
      useUpdateMessageSetting,
      "nobody",
      queryClient,
      fake.client,
    );

    expect(queryClient.getQueryData(["messages", "setting", ME])).toBe(
      "nobody",
    );

    await settle(0, { data: null, error: { code: "42501", message: "no" } });
    await run.done();

    expect(queryClient.getQueryData(["messages", "setting", ME])).toBe(
      "friends",
    );
  });
});
