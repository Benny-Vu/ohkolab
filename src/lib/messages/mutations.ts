/**
 * Direct message writes: sending, starting a conversation, marking one read,
 * reporting a message and the "who can message me" setting. Every mutation
 * checks `directMessagesEnabled()` first: a flag-off build never inserts,
 * updates or calls an RPC — the tables and functions may not exist yet.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { directMessagesEnabled } from "@/lib/messages/flag";
import {
  describeSocialError,
  socialFail,
  type SocialFailure,
  type SocialResult,
} from "@/lib/social/errors";

import { validateMessageBody, type MessageRowLite } from "@/lib/messages/logic";
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
 * Sends a message. The server re-checks every rule (blocks, minors, rate
 * limit); its error codes map through `describeSocialError`. After a send my
 * own last_read_at moves to now, so my messages never count as unread.
 */
export function useSendMessage(client: AppSupabaseClient | null = supabase) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<MessageRowLite>, SocialFailure, SendInput>({
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
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
 * Marks a conversation read: my own last_read_at becomes now. Failures are
 * returned but never fatal — the unread marker just catches up later.
 */
export function useMarkConversationRead(
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, string>({
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
    onSuccess: () => {
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

/** Updates "who can message me". The row is created by the profiles trigger. */
export function useUpdateMessageSetting(
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, WhoCanMessage>({
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", "setting"] });
    },
  });
}
