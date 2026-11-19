import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFakeClient,
  createQueryClient,
  createWrapper,
  SIGNED_IN_AUTH,
  type FakeClientConfig,
} from "@/lib/messages/test-client";
import {
  useCanMessage,
  useConversationMeta,
  useConversations,
  useMessageReportSnapshot,
  useMessageSetting,
  useThread,
  useUnreadMessageCount,
} from "@/lib/messages/queries";

const ME = "user-1";
const OTHER = "user-2";

const PARTICIPANTS = [
  {
    conversation_id: "conv-1",
    user_id: ME,
    last_read_at: "2026-11-19T10:00:00+00:00",
    closed_at: null,
  },
];

const CONVERSATIONS = [
  {
    id: "conv-1",
    user_a: ME,
    user_b: OTHER,
    created_by: ME,
    created_at: "2026-11-18T10:00:00+00:00",
  },
];

const PROFILES = [
  {
    id: OTHER,
    username: "misty",
    display_name: "Misty",
    avatar_species: "Starmie",
  },
];

const MESSAGES = [
  {
    id: "m1",
    conversation_id: "conv-1",
    sender_id: OTHER,
    body: "Hello there",
    created_at: "2026-11-19T10:30:00+00:00",
    deleted_at: null,
  },
  {
    id: "m2",
    conversation_id: "conv-1",
    sender_id: ME,
    body: "Hi",
    created_at: "2026-11-19T10:31:00+00:00",
    deleted_at: null,
  },
  {
    id: "m3",
    conversation_id: "conv-1",
    sender_id: OTHER,
    body: "Secret",
    created_at: "2026-11-19T10:32:00+00:00",
    deleted_at: "2026-11-19T10:33:00+00:00",
  },
];

function messageConfig(overrides: FakeClientConfig = {}): FakeClientConfig {
  return {
    resolve: (record) => {
      if (record.table === "conversation_participants") {
        return record.isMaybeSingle
          ? { data: PARTICIPANTS[0], error: null }
          : { data: PARTICIPANTS, error: null };
      }
      if (record.table === "conversations") {
        return record.isMaybeSingle
          ? { data: CONVERSATIONS[0], error: null }
          : { data: CONVERSATIONS, error: null };
      }
      if (record.table === "profiles") {
        return record.isMaybeSingle
          ? { data: PROFILES[0], error: null }
          : { data: PROFILES, error: null };
      }
      if (record.table === "messages") {
        // The or filter is the unread query: only m1 passes it (newer than
        // last_read_at, from the other player, not deleted).
        if (record.orFilters.length > 0) {
          return { data: [MESSAGES[0]], error: null };
        }
        return { data: MESSAGES, error: null };
      }
      if (record.table === "message_settings") {
        return {
          data: { user_id: ME, who_can_message: "friends", updated_at: "x" },
          error: null,
        };
      }
      if (record.table === "message_reports") {
        return {
          data: {
            report_id: "report-1",
            snapshot: [
              {
                id: "m1",
                sender_id: OTHER,
                body: "Bad message",
                created_at: "2026-11-19T10:30:00Z",
              },
            ],
          },
          error: null,
        };
      }
      return { data: [], error: null };
    },
    rpc: {
      can_message: { data: true, error: null },
    },
    ...overrides,
  };
}

describe("message queries with the flag off", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never touches the client from any hook", async () => {
    const fake = createFakeClient(messageConfig());
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient, SIGNED_IN_AUTH);
    renderHook(() => useConversations(fake.client), { wrapper });
    renderHook(() => useUnreadMessageCount(fake.client), { wrapper });
    renderHook(() => useThread("conv-1", fake.client), { wrapper });
    renderHook(() => useConversationMeta("conv-1", fake.client), { wrapper });
    renderHook(() => useMessageSetting(fake.client), { wrapper });
    renderHook(() => useCanMessage(OTHER, fake.client), { wrapper });
    renderHook(() => useMessageReportSnapshot("report-1", fake.client), {
      wrapper,
    });
    // Give any wrongly-enabled query a beat to fire.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fake.records).toEqual([]);
    expect(fake.rpcCalls).toEqual([]);
    expect(fake.channels).toEqual([]);
  });
});

describe("message queries with the flag on", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lists conversations with the other player and unread counts", async () => {
    const fake = createFakeClient(messageConfig());
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useConversations(fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(1);
    const summary = result.current.data![0]!;
    expect(summary.otherUsername).toBe("misty");
    expect(summary.otherDisplayName).toBe("Misty");
    expect(summary.lastMessage?.body).toBe("Hi");
    expect(summary.lastMessage?.fromMe).toBe(true);
    // m1 is from the other player and newer than last_read_at.
    expect(summary.unread).toBe(1);
    // The unread query used the or filter with quoted values.
    const orRecord = fake.records.find((record) => record.orFilters.length > 0);
    expect(orRecord).toBeDefined();
    expect(orRecord!.orFilters[0]).toContain("deleted_at.is.null");
  });

  it("returns an empty list when there are no conversations", async () => {
    const fake = createFakeClient(
      messageConfig({
        resolve: (record) =>
          record.table === "conversation_participants"
            ? { data: [], error: null }
            : { data: [], error: null },
      }),
    );
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useConversations(fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    // No conversation, profile or message follow-ups after the empty answer.
    expect(
      fake.records.filter(
        (record) => record.table !== "conversation_participants",
      ),
    ).toEqual([]);
  });

  it("counts the total unread for the badge", async () => {
    const fake = createFakeClient(messageConfig());
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useUnreadMessageCount(fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });
    await waitFor(() => expect(result.current.data).toBe(1));
  });

  it("orders the thread oldest first and hides deleted rows", async () => {
    const fake = createFakeClient(messageConfig());
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useThread("conv-1", fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.map((row) => row.id)).toEqual(["m1", "m2"]);
  });

  it("resolves the conversation meta with my participation", async () => {
    const fake = createFakeClient(messageConfig());
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useConversationMeta("conv-1", fake.client),
      { wrapper: createWrapper(queryClient, SIGNED_IN_AUTH) },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.conversation.id).toBe("conv-1");
    expect(result.current.data!.otherProfile?.username).toBe("misty");
    expect(result.current.data!.lastReadAt).toBe("2026-11-19T10:00:00+00:00");
    expect(result.current.data!.closedAt).toBeNull();
  });

  it("returns null meta for a conversation I cannot see", async () => {
    const fake = createFakeClient(
      messageConfig({
        resolve: (record) =>
          record.table === "conversations"
            ? { data: null, error: null }
            : { data: [], error: null },
      }),
    );
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useConversationMeta("conv-x", fake.client),
      { wrapper: createWrapper(queryClient, SIGNED_IN_AUTH) },
    );
    await waitFor(() => expect(result.current.data).toBeNull());
  });

  it("defaults the setting to friends without a row", async () => {
    const fake = createFakeClient(
      messageConfig({
        resolve: (record) =>
          record.table === "message_settings"
            ? { data: null, error: null }
            : { data: [], error: null },
      }),
    );
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useMessageSetting(fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });
    await waitFor(() => expect(result.current.data).toBe("friends"));
  });

  it("reads the who_can_message setting", async () => {
    const fake = createFakeClient(
      messageConfig({
        resolve: (record) =>
          record.table === "message_settings"
            ? {
                data: {
                  user_id: ME,
                  who_can_message: "nobody",
                  updated_at: "x",
                },
                error: null,
              }
            : { data: [], error: null },
      }),
    );
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useMessageSetting(fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });
    await waitFor(() => expect(result.current.data).toBe("nobody"));
  });

  it("asks the server whether I may message a user", async () => {
    const fake = createFakeClient(messageConfig());
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useCanMessage(OTHER, fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });
    await waitFor(() => expect(result.current.data).toBe(true));
    expect(fake.rpcCalls).toEqual([
      { fn: "can_message", args: { other: OTHER } },
    ]);
  });

  it("maps a can_message refusal to false, without duplicating rules", async () => {
    const fake = createFakeClient(
      messageConfig({
        rpc: {
          can_message: {
            data: null,
            error: { code: "42501", message: "no" },
          },
        },
      }),
    );
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useCanMessage(OTHER, fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });
    await waitFor(() => expect(result.current.data).toBe(false));
  });

  it("parses the moderator snapshot of a reported message", async () => {
    const fake = createFakeClient(messageConfig());
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useMessageReportSnapshot("report-1", fake.client),
      { wrapper: createWrapper(queryClient, SIGNED_IN_AUTH) },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0]!.body).toBe("Bad message");
  });
});
