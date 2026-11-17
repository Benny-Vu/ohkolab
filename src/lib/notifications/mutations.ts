/**
 * Notification mutations: marking one or all notifications read and deleting
 * one. Notifications are created by database triggers only — the client never
 * inserts. Every write is scoped to the signed-in recipient, matching the
 * row-level security policies.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

import {
  describeWriteError,
  isSocialNotInstalled,
} from "@/lib/social/availability";
import {
  socialFail,
  socialSucceed,
  type SocialFailure,
  type SocialResult,
} from "@/lib/social/errors";

/** Query-key prefix the notification reads use; writes invalidate it. */
const NOTIFICATIONS_KEY = ["social", "notifications"] as const;

/** Marks one notification read for the signed-in recipient. */
export function useMarkNotificationRead(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<undefined>, SocialFailure, string> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, string>({
    mutationFn: async (notificationId): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      const { error } = await client
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("recipient_id", me);
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      }
    },
  });
}

/** Marks every unread notification of the signed-in recipient read. */
export function useMarkAllNotificationsRead(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<undefined>, SocialFailure, void> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, void>({
    mutationFn: async (): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      const { error } = await client
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", me)
        .is("read_at", null);
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      }
    },
  });
}

/** Deletes one notification for the signed-in recipient. */
export function useDeleteNotification(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<undefined>, SocialFailure, string> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, string>({
    mutationFn: async (notificationId): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      const { error } = await client
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("recipient_id", me);
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      }
    },
  });
}
