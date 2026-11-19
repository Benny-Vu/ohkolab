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
import type { ThreadMessage } from "@/lib/messages/mutations";

/**
 * Subscribes to new messages in one conversation and keeps the thread query
 * cache live. Incoming messages from the other player also refresh the
 * conversation list and the unread badge. An echo of the viewer's own send
 * never duplicates the optimistic copy `useSendMessage` already added: the
 * pending row with the same text is replaced by the confirmed server row.
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
    const threadKey = ["messages", "thread", conversationId] as const;
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
          const current = queryClient.getQueryData<ThreadMessage[]>(threadKey);
          let rows: ThreadMessage[] = current ?? [];
          if (message.sender_id === me) {
            // My own echo: drop the optimistic copy it confirms, if any.
            const echo = rows.find(
              (row) => row.pending === true && row.body === message.body,
            );
            if (echo) {
              rows = rows.filter((row) => row !== echo);
            }
          }
          queryClient.setQueryData<ThreadMessage[]>(
            threadKey,
            threadMessages([...rows, message]),
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
