/**
 * Live delivery: Supabase Realtime on the `messages` table, filtered to one
 * conversation. RLS is enforced for every subscriber server side, so a
 * participant receives only their own conversations' messages. With the
 * flag off no channel is ever created; on unmount the channel is removed.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { directMessagesEnabled } from "@/lib/messages/flag";
import { threadMessages, type MessageRowLite } from "@/lib/messages/logic";

/**
 * Subscribes to new messages in one conversation and keeps the thread query
 * cache live. Incoming messages from the other player also refresh the
 * conversation list and the unread badge.
 */
export function useThreadRealtime(
  conversationId: string,
  client: AppSupabaseClient | null = supabase,
): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const me = user?.id ?? null;

  useEffect(() => {
    if (!directMessagesEnabled() || !client || !me || conversationId === "") {
      return;
    }
    const channel = client
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as unknown as MessageRowLite;
          queryClient.setQueryData<MessageRowLite[]>(
            ["messages", "thread", conversationId],
            (old) => threadMessages([...(old ?? []), message]),
          );
          if (message.sender_id !== me) {
            void queryClient.invalidateQueries({
              queryKey: ["messages", "conversations"],
            });
            void queryClient.invalidateQueries({
              queryKey: ["messages", "unread-count"],
            });
          }
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [client, conversationId, me, queryClient]);
}
