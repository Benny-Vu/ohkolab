import { describe, expect, it } from "vitest";

import {
  buildUnreadFilter,
  hasUnreadFromOther,
  MESSAGE_BODY_MAX,
  otherUserIdOf,
  parseMessageSnapshot,
  reportedSnapshotEntry,
  summarizeConversations,
  threadMessages,
  validateMessageBody,
  type ConversationRowLite,
  type MessageRowLite,
  type ParticipantRowLite,
  type ProfileRowLite,
} from "@/lib/messages/logic";

const ME = "user-1";
const OTHER = "user-2";

function participant(
  partial: Partial<ParticipantRowLite> & { conversationId: string },
): ParticipantRowLite {
  return {
    conversation_id: partial.conversationId,
    user_id: ME,
    last_read_at: "2026-11-19T10:00:00+00:00",
    closed_at: null,
    ...partial,
  };
}

function conversation(
  partial: Partial<ConversationRowLite> & { id: string },
): ConversationRowLite {
  return {
    user_a: ME,
    user_b: OTHER,
    created_by: ME,
    created_at: "2026-11-18T10:00:00+00:00",
    ...partial,
  };
}

function profile(
  partial: Partial<ProfileRowLite> & { id: string },
): ProfileRowLite {
  return {
    username: "trainer",
    display_name: "Trainer",
    avatar_species: "Garchomp",
    ...partial,
  };
}

function message(
  partial: Partial<MessageRowLite> & { id: string },
): MessageRowLite {
  return {
    conversation_id: "conv-1",
    sender_id: OTHER,
    body: "Hello",
    created_at: "2026-11-19T10:30:00+00:00",
    deleted_at: null,
    ...partial,
  };
}

describe("otherUserIdOf", () => {
  it("returns whichever side is not me", () => {
    expect(otherUserIdOf({ user_a: "aaa", user_b: "bbb" }, "bbb")).toBe("aaa");
    expect(otherUserIdOf({ user_a: "aaa", user_b: "bbb" }, "aaa")).toBe("bbb");
  });
});

describe("buildUnreadFilter", () => {
  it("returns null with no conversations", () => {
    expect(buildUnreadFilter(ME, [])).toBeNull();
  });

  it("quotes every value and excludes my own and deleted messages", () => {
    const filter = buildUnreadFilter(ME, [
      {
        conversationId: "conv-1",
        lastReadAt: "2026-11-19T10:00:00+00:00",
      },
    ]);
    expect(filter).toBe(
      '(conversation_id.eq."conv-1",and(created_at.gt."2026-11-19T10:00:00+00:00",' +
        `sender_id.neq."${ME}",deleted_at.is.null))`,
    );
  });

  it("joins conversations with a comma (the or separator)", () => {
    const filter = buildUnreadFilter(ME, [
      { conversationId: "conv-1", lastReadAt: "2026-11-19T10:00:00+00:00" },
      { conversationId: "conv-2", lastReadAt: "2026-11-19T09:00:00+00:00" },
    ]);
    expect(filter).toContain('(conversation_id.eq."conv-2"');
    expect(filter).toContain(",");
    expect(filter!.startsWith('(conversation_id.eq."conv-1"')).toBe(true);
  });
});

describe("validateMessageBody", () => {
  it("accepts ordinary text", () => {
    expect(validateMessageBody("  hi there  ")).toBeNull();
  });

  it("rejects empty and whitespace-only bodies", () => {
    expect(validateMessageBody("")).toBe("empty");
    expect(validateMessageBody("   ")).toBe("empty");
  });

  it("rejects bodies over the server limit", () => {
    expect(validateMessageBody("a".repeat(MESSAGE_BODY_MAX + 1))).toBe(
      "too_long",
    );
    expect(validateMessageBody("a".repeat(MESSAGE_BODY_MAX))).toBeNull();
  });
});

describe("summarizeConversations", () => {
  const participants = [
    participant({ conversationId: "conv-1" }),
    participant({
      conversationId: "conv-2",
      last_read_at: "2026-11-19T12:00:00+00:00",
    }),
  ];
  const conversations = [
    conversation({ id: "conv-1" }),
    conversation({ id: "conv-2", created_at: "2026-11-18T11:00:00+00:00" }),
  ];
  const profiles = [profile({ id: OTHER, username: "misty" })];

  it("combines rows into summaries with unread counts", () => {
    const summaries = summarizeConversations(
      ME,
      participants,
      conversations,
      profiles,
      [
        message({ id: "m1", conversation_id: "conv-1" }),
        message({ id: "m2", conversation_id: "conv-1", body: "Again" }),
      ],
      [message({ id: "m2", conversation_id: "conv-1", body: "Again" })],
    );
    expect(summaries).toHaveLength(2);
    const first = summaries[0]!;
    expect(first.id).toBe("conv-1");
    expect(first.otherUserId).toBe(OTHER);
    expect(first.otherUsername).toBe("misty");
    expect(first.unread).toBe(2);
    expect(first.lastMessage?.body).toBe("Again");
    expect(first.lastMessage?.fromMe).toBe(false);
  });

  it("does not count my own messages as unread", () => {
    const summaries = summarizeConversations(
      ME,
      [participant({ conversationId: "conv-1" })],
      [conversation({ id: "conv-1" })],
      profiles,
      [],
      [
        message({
          id: "mine",
          sender_id: ME,
          body: "My own",
          created_at: "2026-11-19T10:30:00+00:00",
        }),
        message({
          id: "m1",
          body: "Hi",
          created_at: "2026-11-19T10:31:00+00:00",
        }),
      ],
    );
    expect(summaries[0]!.unread).toBe(0);
    expect(summaries[0]!.lastMessage?.fromMe).toBe(false);
    expect(summaries[0]!.lastMessage?.body).toBe("Hi");
  });

  it("counts unread from the or query even without recent messages", () => {
    const summaries = summarizeConversations(
      ME,
      [participant({ conversationId: "conv-2" })],
      [conversation({ id: "conv-2" })],
      profiles,
      [message({ id: "m9", conversation_id: "conv-2", body: "New" })],
      [],
    );
    expect(summaries[0]!.unread).toBe(1);
    expect(summaries[0]!.lastMessage?.body).toBe("New");
  });

  it("sorts by newest activity first", () => {
    const summaries = summarizeConversations(
      ME,
      participants,
      conversations,
      profiles,
      [],
      [
        message({
          id: "old",
          conversation_id: "conv-1",
          // Older than conv-2's start, so conv-2 counts as the active one.
          created_at: "2026-11-18T09:00:00+00:00",
        }),
      ],
    );
    expect(summaries[0]!.id).toBe("conv-2");
    expect(summaries[1]!.id).toBe("conv-1");
  });

  it("keeps a null preview for conversations without messages", () => {
    const summaries = summarizeConversations(
      ME,
      [participant({ conversationId: "conv-1" })],
      [conversation({ id: "conv-1" })],
      profiles,
      [],
      [],
    );
    expect(summaries[0]!.lastMessage).toBeNull();
    expect(summaries[0]!.lastActivityAt).toBe("2026-11-18T10:00:00+00:00");
  });
});

describe("threadMessages", () => {
  it("orders oldest first and hides soft-deleted rows", () => {
    const rows = threadMessages([
      message({ id: "b", created_at: "2026-11-19T10:01:00+00:00" }),
      message({ id: "a", created_at: "2026-11-19T10:00:00+00:00" }),
      message({
        id: "gone",
        created_at: "2026-11-19T10:02:00+00:00",
        deleted_at: "2026-11-19T10:03:00+00:00",
      }),
    ]);
    expect(rows.map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("drops duplicate ids", () => {
    const rows = threadMessages([message({ id: "a" }), message({ id: "a" })]);
    expect(rows).toHaveLength(1);
  });
});

describe("hasUnreadFromOther", () => {
  it("is true only for other players' newer messages", () => {
    const messages = [
      message({ id: "old-other", created_at: "2026-11-19T09:00:00+00:00" }),
      message({
        id: "mine",
        sender_id: ME,
        created_at: "2026-11-19T11:00:00+00:00",
      }),
    ];
    expect(
      hasUnreadFromOther(OTHER, "2026-11-19T10:00:00+00:00", messages),
    ).toBe(false);
    expect(
      hasUnreadFromOther(OTHER, "2026-11-19T08:00:00+00:00", messages),
    ).toBe(true);
  });
});

describe("parseMessageSnapshot", () => {
  it("parses valid entries and skips malformed ones", () => {
    const entries = parseMessageSnapshot([
      {
        id: "m1",
        sender_id: "u1",
        body: "Hello",
        created_at: "2026-11-19T10:00:00Z",
      },
      { id: 42, sender_id: "u1", body: "bad", created_at: "x" },
      "not an object",
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.id).toBe("m1");
  });

  it("returns an empty list for non-arrays", () => {
    expect(parseMessageSnapshot(null)).toEqual([]);
    expect(parseMessageSnapshot({})).toEqual([]);
  });
});

describe("reportedSnapshotEntry", () => {
  it("is the newest entry, the one the report is about", () => {
    const entries = parseMessageSnapshot([
      {
        id: "m1",
        sender_id: "u1",
        body: "before",
        created_at: "2026-11-19T10:00:00Z",
      },
      {
        id: "m2",
        sender_id: "u1",
        body: "reported",
        created_at: "2026-11-19T10:01:00Z",
      },
    ]);
    expect(reportedSnapshotEntry(entries)?.id).toBe("m2");
    expect(reportedSnapshotEntry([])).toBeNull();
  });
});
