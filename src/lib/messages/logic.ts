/**
 * Pure logic for direct messages: the unread filter, the conversation list
 * summary and the moderator snapshot parser. No Supabase, no React — tests
 * sit next to this file. Everything in `@/lib/messages` is behind the
 * VITE_DIRECT_MESSAGES flag (see `flag.ts`): the hooks here never run and the
 * tables are never queried while it is off.
 */

/** The server enforces 1 to 2000 characters per message body. */
export const MESSAGE_BODY_MAX = 2000;

/** How many messages a thread loads at once (the latest ones). */
export const THREAD_PAGE_SIZE = 200;

/** The message columns every query in this layer selects. */
export interface MessageRowLite {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
}

export interface ParticipantRowLite {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  closed_at: string | null;
}

export interface ConversationRowLite {
  id: string;
  user_a: string;
  user_b: string;
  created_by: string;
  created_at: string;
}

export interface ProfileRowLite {
  id: string;
  username: string;
  display_name: string | null;
  avatar_species: string | null;
}

/** One row of the conversation list. */
export interface ConversationSummary {
  id: string;
  otherUserId: string;
  otherUsername: string;
  otherDisplayName: string | null;
  otherAvatarSpecies: string | null;
  /** My own participant row; drives the unread marker. */
  lastReadAt: string;
  closedAt: string | null;
  /** Messages from the other player newer than lastReadAt (never mine). */
  unread: number;
  /** When the conversation was last active (or started). */
  lastActivityAt: string;
  /**
   * The newest visible message, or null when there is none. A conversation
   * whose newest message was soft-deleted shows `deleted: true` with an
   * empty body, so the list can say so without revealing the text.
   */
  lastMessage: {
    body: string;
    fromMe: boolean;
    createdAt: string;
    deleted?: boolean;
  } | null;
}

/** The other participant of a conversation. */
export function otherUserIdOf(
  conversation: Pick<ConversationRowLite, "user_a" | "user_b">,
  me: string,
): string {
  return conversation.user_a === me ? conversation.user_b : conversation.user_a;
}

/**
 * Builds the PostgREST `or` filter that fetches every unread message in one
 * query: for each conversation, messages from the other player newer than my
 * last_read_at that are not soft-deleted. Values are double-quoted because
 * timestamps contain colons. Returns null when there is nothing to ask for.
 */
export function buildUnreadFilter(
  me: string,
  entries: Array<{ conversationId: string; lastReadAt: string }>,
): string | null {
  if (entries.length === 0) return null;
  const groups = entries.map(
    ({ conversationId, lastReadAt }) =>
      `(conversation_id.eq."${conversationId}",and(created_at.gt."${lastReadAt}",sender_id.neq."${me}",deleted_at.is.null))`,
  );
  return groups.join(",");
}

/**
 * Validates a message body before it is sent. Returns null when it is fine,
 * or "empty" / "too_long" so the caller can show the right message.
 */
export function validateMessageBody(body: string): "empty" | "too_long" | null {
  const trimmed = body.trim();
  if (trimmed.length === 0) return "empty";
  if (trimmed.length > MESSAGE_BODY_MAX) return "too_long";
  return null;
}

/**
 * Combines the four list queries into the conversation summaries, newest
 * activity first. `unreadMessages` comes from the `or` filter built by
 * `buildUnreadFilter`; `recentMessages` is a batch of the latest messages
 * across the conversations (used for previews — a conversation whose newest
 * message is older than that batch shows no preview).
 */
export function summarizeConversations(
  me: string,
  participants: ParticipantRowLite[],
  conversations: ConversationRowLite[],
  profiles: ProfileRowLite[],
  unreadMessages: MessageRowLite[],
  recentMessages: MessageRowLite[],
): ConversationSummary[] {
  const conversationById = new Map(conversations.map((row) => [row.id, row]));
  const profileById = new Map(profiles.map((row) => [row.id, row]));
  const profileByConversation = new Map(
    participants.map((row) => [
      row.conversation_id,
      profileById.get(
        otherUserIdOf(conversationById.get(row.conversation_id)!, me),
      ),
    ]),
  );

  const unreadByConversation = new Map<string, MessageRowLite[]>();
  for (const message of unreadMessages) {
    const list = unreadByConversation.get(message.conversation_id) ?? [];
    list.push(message);
    unreadByConversation.set(message.conversation_id, list);
  }

  const newestRaw = new Map<string, MessageRowLite>();
  const newestVisible = new Map<string, MessageRowLite>();
  const offer = (map: Map<string, MessageRowLite>, message: MessageRowLite) => {
    const current = map.get(message.conversation_id);
    if (
      !current ||
      message.created_at > current.created_at ||
      (message.created_at === current.created_at && message.id > current.id)
    ) {
      map.set(message.conversation_id, message);
    }
  };
  for (const message of recentMessages) {
    offer(newestRaw, message);
    if (message.deleted_at === null) {
      offer(newestVisible, message);
    }
  }
  // Unread messages (never deleted, from the or query) are also candidates.
  for (const message of unreadMessages) {
    offer(newestRaw, message);
    offer(newestVisible, message);
  }

  const summaries: ConversationSummary[] = participants.flatMap(
    (participant) => {
      const conversation = conversationById.get(participant.conversation_id);
      if (!conversation) return [];
      const profile = profileByConversation.get(participant.conversation_id);
      const unread =
        unreadByConversation.get(participant.conversation_id) ?? [];
      const newest =
        newestVisible.get(participant.conversation_id) ??
        newestRaw.get(participant.conversation_id);
      return [
        {
          id: conversation.id,
          otherUserId: otherUserIdOf(conversation, me),
          otherUsername: profile?.username ?? "",
          otherDisplayName: profile?.display_name ?? null,
          otherAvatarSpecies: profile?.avatar_species ?? null,
          lastReadAt: participant.last_read_at,
          closedAt: participant.closed_at,
          unread: unread.length,
          lastActivityAt: newest?.created_at ?? conversation.created_at,
          lastMessage: newest
            ? {
                body: newest.body,
                fromMe: newest.sender_id === me,
                createdAt: newest.created_at,
                // The newest message may be soft-deleted: the list says so
                // without showing its text.
                deleted: newest.deleted_at !== null || undefined,
              }
            : null,
        },
      ];
    },
  );

  summaries.sort((a, b) => {
    if (a.lastActivityAt !== b.lastActivityAt) {
      return a.lastActivityAt < b.lastActivityAt ? 1 : -1;
    }
    return a.id < b.id ? 1 : -1;
  });
  return summaries;
}

/**
 * Orders thread messages oldest first, drops duplicates and hides
 * soft-deleted rows (the body stays in the database; the app never shows it).
 */
export function threadMessages(rows: MessageRowLite[]): MessageRowLite[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return [...byId.values()]
    .filter((row) => row.deleted_at === null)
    .sort((a, b) => {
      if (a.created_at !== b.created_at) {
        return a.created_at < b.created_at ? -1 : 1;
      }
      return a.id < b.id ? -1 : 1;
    });
}

/** True when the thread has messages from the other player I have not read. */
export function hasUnreadFromOther(
  otherUserId: string,
  lastReadAt: string,
  messages: MessageRowLite[],
): boolean {
  return messages.some(
    (message) =>
      message.sender_id === otherUserId && message.created_at > lastReadAt,
  );
}

/** One message copied into a report snapshot (see `report_message()`). */
export interface MessageSnapshotEntry {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

function readSnapshotEntry(value: unknown): MessageSnapshotEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const entry = value as Record<string, unknown>;
  if (
    typeof entry.id !== "string" ||
    typeof entry.sender_id !== "string" ||
    typeof entry.body !== "string" ||
    typeof entry.created_at !== "string"
  ) {
    return null;
  }
  return {
    id: entry.id,
    sender_id: entry.sender_id,
    body: entry.body,
    created_at: entry.created_at,
  };
}

/**
 * Parses the jsonb snapshot of a reported message: the reported message plus
 * the 20 before it, oldest first. Anything malformed is skipped rather than
 * trusted (the column is jsonb; the database cannot vouch for its shape).
 */
export function parseMessageSnapshot(value: unknown): MessageSnapshotEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const parsed = readSnapshotEntry(entry);
    return parsed ? [parsed] : [];
  });
}

/**
 * The reported message of a snapshot: the newest entry, which is the one the
 * report is about (the server copies it plus the 20 before it).
 */
export function reportedSnapshotEntry(
  entries: MessageSnapshotEntry[],
): MessageSnapshotEntry | null {
  if (entries.length === 0) return null;
  return entries[entries.length - 1] ?? null;
}
