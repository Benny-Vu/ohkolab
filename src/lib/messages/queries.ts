/**
 * Direct message reads: the conversation list with unread counts, the
 * thread, the "who can message me" setting, the profile-button check and the
 * moderator's report snapshot. Every hook here is disabled unless
 * `directMessagesEnabled()` is true, so a flag-off build never queries the
 * direct message tables — their migration may not be applied yet.
 */

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { directMessagesEnabled } from "@/lib/messages/flag";

import {
  buildUnreadFilter,
  otherUserIdOf,
  parseMessageSnapshot,
  summarizeConversations,
  THREAD_PAGE_SIZE,
  threadMessages,
  type ConversationRowLite,
  type ConversationSummary,
  type MessageRowLite,
  type MessageSnapshotEntry,
  type ParticipantRowLite,
  type ProfileRowLite,
} from "@/lib/messages/logic";

/** The three values `message_settings.who_can_message` allows. */
export type WhoCanMessage = "friends" | "following" | "nobody";

/**
 * Every read here fails soft: while the migration is unapplied (the flag
 * should be off) or the request fails, the lists render empty instead of
 * erroring. Unlike the social layer this must NOT poison the shared
 * "not installed" cache, because the social tables can exist without the
 * direct message ones.
 */
function softEmpty<T>(error: unknown, empty: T): T {
  void error;
  return empty;
}

const PARTICIPANT_COLUMNS = "conversation_id, user_id, last_read_at, closed_at";
const CONVERSATION_COLUMNS = "id, user_a, user_b, created_by, created_at";
const PROFILE_COLUMNS = "id, username, display_name, avatar_species";
const MESSAGE_COLUMNS =
  "id, conversation_id, sender_id, body, created_at, deleted_at";

/** My participant rows (RLS already limits them to my own). */
async function fetchParticipants(
  client: AppSupabaseClient,
  me: string,
): Promise<ParticipantRowLite[]> {
  const { data, error } = await client
    .from("conversation_participants")
    .select(PARTICIPANT_COLUMNS)
    .eq("user_id", me);
  if (error) {
    return softEmpty(error, []);
  }
  return (data ?? []) as unknown as ParticipantRowLite[];
}

/** The unread messages across my conversations, in one `or` query. */
export async function fetchUnreadMessages(
  client: AppSupabaseClient,
  me: string,
  participants: ParticipantRowLite[],
): Promise<MessageRowLite[]> {
  const filter = buildUnreadFilter(
    me,
    participants.map((row) => ({
      conversationId: row.conversation_id,
      lastReadAt: row.last_read_at,
    })),
  );
  if (filter === null) {
    return [];
  }
  const { data, error } = await client
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .or(filter);
  if (error) {
    return softEmpty(error, []);
  }
  return (data ?? []) as unknown as MessageRowLite[];
}

/**
 * The conversation list, newest activity first: the other player's profile,
 * the newest message as a preview and the unread count (messages from the
 * other player newer than my last_read_at).
 */
export function useConversations(client: AppSupabaseClient | null = supabase) {
  const { user } = useAuth();
  return useQuery<ConversationSummary[]>({
    queryKey: ["messages", "conversations", user?.id ?? null],
    enabled: directMessagesEnabled() && client !== null && user !== null,
    retry: false,
    queryFn: async () => {
      const me = user!.id;
      const live = client!;
      const participants = await fetchParticipants(live, me);
      if (participants.length === 0) {
        return [];
      }
      const ids = participants.map((row) => row.conversation_id);
      const { data: conversations, error: conversationError } = await live
        .from("conversations")
        .select(CONVERSATION_COLUMNS)
        .in("id", ids);
      if (conversationError) {
        return softEmpty(conversationError, []);
      }
      const rows = (conversations ?? []) as unknown as ConversationRowLite[];
      const otherIds = rows.map((row) => otherUserIdOf(row, me));
      const { data: profiles } = await live
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .in("id", otherIds);
      const unread = await fetchUnreadMessages(live, me, participants);
      const { data: recent } = await live
        .from("messages")
        .select(MESSAGE_COLUMNS)
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(100);
      return summarizeConversations(
        me,
        participants,
        rows,
        (profiles ?? []) as unknown as ProfileRowLite[],
        unread,
        (recent ?? []) as unknown as MessageRowLite[],
      );
    },
  });
}

/** The total number of unread messages, for the nav badge. */
export function useUnreadMessageCount(
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  return useQuery<number>({
    queryKey: ["messages", "unread-count", user?.id ?? null],
    enabled: directMessagesEnabled() && client !== null && user !== null,
    retry: false,
    staleTime: 30_000,
    queryFn: async () => {
      const me = user!.id;
      const participants = await fetchParticipants(client!, me);
      const unread = await fetchUnreadMessages(client!, me, participants);
      return unread.length;
    },
  });
}

/** One conversation's messages, oldest first, soft-deleted rows hidden. */
export function useThread(
  conversationId: string,
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  return useQuery<MessageRowLite[]>({
    queryKey: ["messages", "thread", conversationId],
    enabled:
      directMessagesEnabled() &&
      client !== null &&
      user !== null &&
      conversationId !== "",
    retry: false,
    queryFn: async () => {
      const { data, error } = await client!
        .from("messages")
        .select(MESSAGE_COLUMNS)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(THREAD_PAGE_SIZE);
      if (error) {
        return softEmpty(error, []);
      }
      return threadMessages((data ?? []) as unknown as MessageRowLite[]);
    },
  });
}

/** The conversation row, the other player's profile and my own participation. */
export interface ConversationMeta {
  conversation: ConversationRowLite;
  otherProfile: ProfileRowLite | null;
  lastReadAt: string;
  closedAt: string | null;
}

/** Everything the thread page needs besides the messages themselves. */
export function useConversationMeta(
  conversationId: string,
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  return useQuery<ConversationMeta | null>({
    queryKey: ["messages", "conversation", conversationId],
    enabled:
      directMessagesEnabled() &&
      client !== null &&
      user !== null &&
      conversationId !== "",
    retry: false,
    queryFn: async () => {
      const me = user!.id;
      const { data: conversation, error } = await client!
        .from("conversations")
        .select(CONVERSATION_COLUMNS)
        .eq("id", conversationId)
        .maybeSingle();
      if (error) {
        return softEmpty(error, null);
      }
      if (!conversation) {
        return null;
      }
      const row = conversation as unknown as ConversationRowLite;
      const { data: participant } = await client!
        .from("conversation_participants")
        .select(PARTICIPANT_COLUMNS)
        .eq("conversation_id", conversationId)
        .eq("user_id", me)
        .maybeSingle();
      const { data: profile } = await client!
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", otherUserIdOf(row, me))
        .maybeSingle();
      const mine = participant as unknown as ParticipantRowLite | null;
      return {
        conversation: row,
        otherProfile: (profile ?? null) as unknown as ProfileRowLite | null,
        lastReadAt: mine?.last_read_at ?? row.created_at,
        closedAt: mine?.closed_at ?? null,
      };
    },
  });
}

/** My "who can message me" setting; "friends" when there is no row. */
export function useMessageSetting(client: AppSupabaseClient | null = supabase) {
  const { user } = useAuth();
  return useQuery<WhoCanMessage>({
    queryKey: ["messages", "setting", user?.id ?? null],
    enabled: directMessagesEnabled() && client !== null && user !== null,
    retry: false,
    // Own setting: the switch mutation invalidates this key, so the
    // staleTime only serves revisits.
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await client!
        .from("message_settings")
        .select("user_id, who_can_message, updated_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) {
        return softEmpty(error, "friends" as WhoCanMessage);
      }
      const value = data?.who_can_message;
      return value === "following" || value === "nobody" ? value : "friends";
    },
  });
}

/**
 * Whether the server lets me start a conversation with the other user. The
 * profile's Message button asks this; the rules live server side and are
 * never duplicated here.
 */
export function useCanMessage(
  otherUserId: string,
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  return useQuery<boolean>({
    queryKey: ["messages", "can-message", otherUserId, user?.id ?? null],
    enabled:
      directMessagesEnabled() &&
      client !== null &&
      user !== null &&
      otherUserId !== "",
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await client!.rpc("can_message", {
        other: otherUserId,
      });
      if (error) {
        return false;
      }
      return data === true;
    },
  });
}

/**
 * Moderators only: the snapshot behind a message report (the reported
 * message plus the 20 before it, oldest first). Moderators never read the
 * messages table; this is the only message content they can see.
 */
export function useMessageReportSnapshot(
  reportId: string,
  client: AppSupabaseClient | null = supabase,
) {
  return useQuery<MessageSnapshotEntry[] | null>({
    queryKey: ["messages", "report-snapshot", reportId],
    enabled: directMessagesEnabled() && client !== null && reportId !== "",
    retry: false,
    queryFn: async () => {
      const { data, error } = await client!
        .from("message_reports")
        .select("report_id, snapshot")
        .eq("report_id", reportId)
        .maybeSingle();
      if (error) {
        return softEmpty(error, null);
      }
      const snapshot = (data as { snapshot?: unknown } | null)?.snapshot;
      return parseMessageSnapshot(snapshot);
    },
  });
}
