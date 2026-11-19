import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFakeClient,
  expectFailed,
  runMutation,
  type FakeClientConfig,
} from "@/lib/messages/test-client";
import {
  useMarkConversationRead,
  useReportMessage,
  useSendMessage,
  useStartConversation,
  useUpdateMessageSetting,
} from "@/lib/messages/mutations";

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
