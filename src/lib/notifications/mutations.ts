/**
 * Notification mutations: marking one or all notifications read and deleting
 * one. Notifications are created by database triggers only — the client never
 * inserts. Every write is scoped to the signed-in recipient, matching the
 * row-level security policies. Each mutation applies its change to the
 * cached list and unread count optimistically and rolls both back when the
 * server refuses.
 */

import {
  useMutation,
  useQueryClient,
  type QueryKey,
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
import type { NotificationItem } from "@/lib/notifications/types";

/** Query-key prefix the notification reads use; writes invalidate it. */
const NOTIFICATIONS_KEY = ["social", "notifications"] as const;

/** Snapshots restored when an optimistic notification write is refused. */
export interface NotificationSnapshot {
  snapshots: Array<[QueryKey, unknown]>;
}

interface NotificationPages {
  pages: NotificationItem[][];
}

function isNotificationPages(value: unknown): value is NotificationPages {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { pages?: unknown }).pages)
  );
}

/** Reads the item out of the cached pages, or null when it is not cached. */
function findCachedNotification(
  queryClient: ReturnType<typeof useQueryClient>,
  notificationId: string,
): NotificationItem | null {
  for (const [, data] of queryClient.getQueriesData({
    queryKey: NOTIFICATIONS_KEY,
  })) {
    if (!isNotificationPages(data)) continue;
    for (const page of data.pages) {
      const found = page.find((item) => item.id === notificationId);
      if (found) return found;
    }
  }
  return null;
}

/** Maps the cached list pages with `apply`; returns whether anything changed. */
function mapCachedNotifications(
  queryClient: ReturnType<typeof useQueryClient>,
  apply: (item: NotificationItem) => NotificationItem | null,
): void {
  for (const [key, data] of queryClient.getQueriesData({
    queryKey: NOTIFICATIONS_KEY,
  })) {
    if (isNotificationPages(data)) {
      queryClient.setQueryData(key, {
        ...data,
        pages: data.pages.map((page) =>
          page.flatMap((item) => {
            const next = apply(item);
            return next === null ? [] : [next];
          }),
        ),
      });
    }
  }
}

/** Adjusts the cached unread count, leaving a missing cache alone. */
function adjustCachedUnreadCount(
  queryClient: ReturnType<typeof useQueryClient>,
  delta: number,
): void {
  for (const [key, data] of queryClient.getQueriesData({
    queryKey: NOTIFICATIONS_KEY,
  })) {
    if (key[2] === "unread-count" && typeof data === "number") {
      queryClient.setQueryData(key, Math.max(0, data + delta));
    }
  }
}

/** Restores the snapshots taken before an optimistic write. */
function rollback(
  queryClient: ReturnType<typeof useQueryClient>,
  context: NotificationSnapshot | undefined,
): void {
  if (!context) return;
  for (const [key, data] of context.snapshots) {
    queryClient.setQueryData(key, data);
  }
}

/** Marks one notification read for the signed-in recipient. */
export function useMarkNotificationRead(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  string,
  NotificationSnapshot
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    string,
    NotificationSnapshot
  >({
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
    onMutate: (notificationId) => {
      if (!user || !notificationId) {
        return { snapshots: [] };
      }
      const snapshots = queryClient.getQueriesData({
        queryKey: NOTIFICATIONS_KEY,
      });
      const cached = findCachedNotification(queryClient, notificationId);
      if (cached && cached.readAt === null) {
        const stamp = new Date().toISOString();
        mapCachedNotifications(queryClient, (item) =>
          item.id === notificationId ? { ...item, readAt: stamp } : item,
        );
        adjustCachedUnreadCount(queryClient, -1);
      }
      return { snapshots };
    },
    onSuccess: (result, _variables, context) => {
      if (!result.ok) rollback(queryClient, context);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

/** Marks every unread notification of the signed-in recipient read. */
export function useMarkAllNotificationsRead(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  void,
  NotificationSnapshot
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    void,
    NotificationSnapshot
  >({
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
    onMutate: () => {
      if (!user) {
        return { snapshots: [] };
      }
      const snapshots = queryClient.getQueriesData({
        queryKey: NOTIFICATIONS_KEY,
      });
      const stamp = new Date().toISOString();
      mapCachedNotifications(queryClient, (item) =>
        item.readAt === null ? { ...item, readAt: stamp } : item,
      );
      for (const [key, data] of snapshots) {
        if (key[2] === "unread-count" && typeof data === "number") {
          queryClient.setQueryData(key, 0);
        }
      }
      return { snapshots };
    },
    onSuccess: (result, _variables, context) => {
      if (!result.ok) rollback(queryClient, context);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

/** Deletes one notification for the signed-in recipient. */
export function useDeleteNotification(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  string,
  NotificationSnapshot
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    string,
    NotificationSnapshot
  >({
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
    onMutate: (notificationId) => {
      if (!user || !notificationId) {
        return { snapshots: [] };
      }
      const snapshots = queryClient.getQueriesData({
        queryKey: NOTIFICATIONS_KEY,
      });
      const cached = findCachedNotification(queryClient, notificationId);
      mapCachedNotifications(queryClient, (item) =>
        item.id === notificationId ? null : item,
      );
      if (cached && cached.readAt === null) {
        adjustCachedUnreadCount(queryClient, -1);
      }
      return { snapshots };
    },
    onSuccess: (result, _variables, context) => {
      if (!result.ok) rollback(queryClient, context);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
