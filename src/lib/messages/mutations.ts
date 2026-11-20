/**
 * Direct message writes: sending, starting a conversation, marking one read,
 * reporting a message and the "who can message me" setting. Every mutation
 * checks `directMessagesEnabled()` first: a flag-off build never inserts,
 * updates or calls an RPC — the tables and functions may not exist yet.
 */

import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { directMessagesEnabled } from "@/lib/messages/flag";
import {
  describeSocialError,
  socialFail,
  type SocialFailure,
  type SocialResult,
} from "@/lib/social/errors";

import {
  threadMessages,
  validateMessageBody,
  type ConversationSummary,
  type MessageRowLite,
} from "@/lib/messages/logic";
import type { WhoCanMessage } from "@/lib/messages/queries";

/** The report reasons the server accepts (the feed's report dialog set). */
export const MESSAGE_REPORT_REASONS = [
  "spam",
  "harassment",
  "inappropriate",
  "other",
] as const;
export type MessageReportReason = (typeof MESSAGE_REPORT_REASONS)[number];

interface SendInput {
  conversationId: string;
  body: string;
}

/**
 * A thread row as the send flow stores it in the thread cache: a plain
 * server row, or the optimistic copy of a send in flight (`pending`) or one
 * the server refused (`failed`, shown with a Retry action).
 */
export interface ThreadMessage extends MessageRowLite {
  /** True until the server confirms the send. */
  pending?: boolean;
  /** True when the send failed; the row stays until retried or refreshed. */
  failed?: boolean;
}

/** The thread cache key for one conversation. */
function threadKey(conversationId: string): QueryKey {
  return ["messages", "thread", conversationId];
}

/** Snapshots restored when an optimistic message write is refused. */
export interface MessageSnapshot {
  snapshots: Array<[QueryKey, unknown]>;
}

function rollbackMessages(
  queryClient: ReturnType<typeof useQueryClient>,
  context: MessageSnapshot | undefined,
): void {
  if (!context) return;
  for (const [key, data] of context.snapshots) {
    queryClient.setQueryData(key, data);
  }
}

/** What the optimistic send needs to clean up after itself. */
interface SendContext {
  /** The optimistic row's id; null when nothing was added to the cache. */
  localId: string | null;
}

/**
 * Marks the optimistic row failed (it keeps its place, with a Retry action)
 * after the server refused the send or the write threw.
 */
function markSendFailed(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  localId: string | null,
): void {
  if (!localId) return;
  queryClient.setQueryData<ThreadMessage[]>(threadKey(conversationId), (old) =>
    (old ?? []).map((row) =>
      row.id === localId ? { ...row, pending: false, failed: true } : row,
    ),
  );
}

/**
 * Sends a message. The optimistic copy appears in the thread at once, marked
 * pending; a Realtime echo of the same message replaces it (see realtime.ts),
 * and a failure keeps the row with a Retry action instead of dropping it.
 * The server re-checks every rule (blocks, minors, rate limit); its error
 * codes map through `describeSocialError`. After a send my own last_read_at
 * moves to now, so my messages never count as unread.
 */
export function useSendMessage(client: AppSupabaseClient | null = supabase) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<MessageRowLite>,
    SocialFailure,
    SendInput,
    SendContext
  >({
    mutationFn: async ({
      conversationId,
      body,
    }): Promise<SocialResult<MessageRowLite>> => {
      if (!directMessagesEnabled() || !client) {
        return socialFail("not_configured");
      }
      if (!user) {
        return socialFail("not_signed_in");
      }
      const problem = validateMessageBody(body);
      if (problem === "empty") {
        return socialFail("invalid_input");
      }
      if (problem === "too_long") {
        return socialFail("too_long");
      }
      const trimmed = body.trim();
      const { data, error } = await client
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          body: trimmed,
        })
        .select("id, conversation_id, sender_id, body, created_at, deleted_at")
        .single();
      if (error) {
        return { ok: false, error: describeSocialError(error) };
      }
      const message = data as unknown as MessageRowLite;
      // My own messages are read the moment I send them.
      await client
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      return { ok: true, data: message };
    },
    onMutate: ({ conversationId, body }) => {
      if (
        !directMessagesEnabled() ||
        !client ||
        !user ||
        !conversationId ||
        validateMessageBody(body ?? "") !== null
      ) {
        // The mutation will fail without a write; nothing to show yet.
        return { localId: null };
      }
      const key = threadKey(conversationId);
      const current = queryClient.getQueryData<ThreadMessage[]>(key) ?? [];
      const trimmed = body.trim();
      // A retry reuses the failed row instead of stacking a second copy.
      const failedCopy = current.find(
        (row) => row.failed === true && row.body === trimmed,
      );
      if (failedCopy) {
        queryClient.setQueryData<ThreadMessage[]>(key, (old) =>
          (old ?? []).map((row) =>
            row.id === failedCopy.id
              ? { ...row, pending: true, failed: false }
              : row,
          ),
        );
        return { localId: failedCopy.id };
      }
      const localId = `local-${crypto.randomUUID()}`;
      queryClient.setQueryData<ThreadMessage[]>(key, [
        ...current,
        {
          id: localId,
          conversation_id: conversationId,
          sender_id: user.id,
          body: trimmed,
          created_at: new Date().toISOString(),
          deleted_at: null,
          pending: true,
        },
      ]);
      return { localId };
    },
    onSuccess: (result, variables, context) => {
      if (!result.ok) {
        // The row stays, flagged failed, with a Retry action on the page.
        markSendFailed(
          queryClient,
          variables.conversationId,
          context?.localId ?? null,
        );
        return;
      }
      // Swap the optimistic copy for the confirmed server row; a Realtime
      // echo may already have done it, in which case this is a no-op.
      if (context?.localId) {
        const key = threadKey(variables.conversationId);
        queryClient.setQueryData<ThreadMessage[]>(key, (old) =>
          threadMessages(
            (old ?? []).map((row) =>
              row.id === context.localId ? result.data : row,
            ),
          ),
        );
      }
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (_error, variables, context) => {
      // The write threw (for example the network dropped mid-request).
      markSendFailed(
        queryClient,
        variables.conversationId,
        context?.localId ?? null,
      );
    },
  });
}

/**
 * Starts (or returns the existing) conversation with another player, per the
 * server's rules. Error codes: P0A08 (too many new conversations today),
 * 42501 (a rule forbids it), 23514 (account too new or unconfirmed).
 */
export function useStartConversation(
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<string>, SocialFailure, string>({
    mutationFn: async (otherUserId): Promise<SocialResult<string>> => {
      if (!directMessagesEnabled() || !client) {
        return socialFail("not_configured");
      }
      if (!user) {
        return socialFail("not_signed_in");
      }
      const { data, error } = await client.rpc("start_conversation", {
        other: otherUserId,
      });
      if (error) {
        return { ok: false, error: describeSocialError(error) };
      }
      return { ok: true, data: data as string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

/**
 * Marks a conversation read: my own last_read_at becomes now. The cached
 * conversation summary and unread count update optimistically and roll back
 * when the write is refused. Failures are returned but never fatal — the
 * unread marker just catches up later.
 */
export function useMarkConversationRead(
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    string,
    MessageSnapshot
  >({
    mutationFn: async (conversationId): Promise<SocialResult<undefined>> => {
      if (!directMessagesEnabled() || !client) {
        return socialFail("not_configured");
      }
      if (!user) {
        return socialFail("not_signed_in");
      }
      const { error } = await client
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      if (error) {
        return { ok: false, error: describeSocialError(error) };
      }
      return { ok: true, data: undefined };
    },
    onMutate: (conversationId) => {
      if (!directMessagesEnabled() || !client || !user || !conversationId) {
        return { snapshots: [] };
      }
      const snapshots = queryClient.getQueriesData({ queryKey: ["messages"] });
      const stamp = new Date().toISOString();
      let cleared = 0;
      for (const [key, data] of snapshots) {
        if (key[1] === "conversations" && Array.isArray(data)) {
          const summaries = data as ConversationSummary[];
          const mine = summaries.find(
            (summary) => summary.id === conversationId,
          );
          cleared = mine?.unread ?? 0;
          queryClient.setQueryData(
            key,
            summaries.map((summary) =>
              summary.id === conversationId
                ? { ...summary, unread: 0, lastReadAt: stamp }
                : summary,
            ),
          );
        }
      }
      if (cleared > 0) {
        for (const [key, data] of snapshots) {
          if (key[1] === "unread-count" && typeof data === "number") {
            queryClient.setQueryData(key, Math.max(0, data - cleared));
          }
        }
      }
      return { snapshots };
    },
    onSuccess: (result, _variables, context) => {
      if (!result.ok) rollbackMessages(queryClient, context);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["messages", "conversations"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["messages", "unread-count"],
      });
    },
  });
}

/**
 * Reports a message: the server copies it and the 20 before it into a
 * snapshot and files the report in the existing moderation queue (reusing
 * its rate limit). Returns the queue row's id.
 */
export function useReportMessage(client: AppSupabaseClient | null = supabase) {
  const { user } = useAuth();
  return useMutation<
    SocialResult<string>,
    SocialFailure,
    { messageId: string; reason: MessageReportReason }
  >({
    mutationFn: async ({
      messageId,
      reason,
    }): Promise<SocialResult<string>> => {
      if (!directMessagesEnabled() || !client) {
        return socialFail("not_configured");
      }
      if (!user) {
        return socialFail("not_signed_in");
      }
      const { data, error } = await client.rpc("report_message", {
        message_id: messageId,
        reason,
      });
      if (error) {
        return { ok: false, error: describeSocialError(error) };
      }
      return { ok: true, data: data as string };
    },
  });
}

/**
 * Updates "who can message me". The select flips optimistically and rolls
 * back when the write is refused. The row is created by the profiles trigger.
 */
export function useUpdateMessageSetting(
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    WhoCanMessage,
    MessageSnapshot
  >({
    mutationFn: async (value): Promise<SocialResult<undefined>> => {
      if (!directMessagesEnabled() || !client) {
        return socialFail("not_configured");
      }
      if (!user) {
        return socialFail("not_signed_in");
      }
      const { error } = await client
        .from("message_settings")
        .update({ who_can_message: value })
        .eq("user_id", user.id);
      if (error) {
        return { ok: false, error: describeSocialError(error) };
      }
      return { ok: true, data: undefined };
    },
    onMutate: (value) => {
      if (!directMessagesEnabled() || !client || !user || !value) {
        return { snapshots: [] };
      }
      const snapshots = queryClient.getQueriesData({
        queryKey: ["messages", "setting"],
      });
      for (const [key] of snapshots) {
        queryClient.setQueryData(key, value);
      }
      return { snapshots };
    },
    onSuccess: (result, _variables, context) => {
      if (!result.ok) {
        rollbackMessages(queryClient, context);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["messages", "setting"] });
    },
  });
}
