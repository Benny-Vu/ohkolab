/**
 * Read hooks for notifications: the recipient's keyset-paginated list with
 * actors, groups and moderation actions resolved for display, plus the
 * unread count that drives the header bell. Reads fail soft (empty data, no
 * error state) while the social tables are missing. The count refreshes on
 * window focus and every minute so the bell stays current without a socket.
 */

import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import type { NotificationRow } from "@/lib/database.types";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

import { isSocialNotInstalled, softReadError } from "@/lib/social/availability";
import type { SocialFailure } from "@/lib/social/errors";
import type {
  NotificationActor,
  NotificationGroup,
  NotificationItem,
  NotificationModeration,
} from "@/lib/notifications/types";

/** Page size for the keyset-paginated notifications list. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

/** How often the unread count refreshes, in milliseconds. */
export const UNREAD_REFRESH_MS = 60_000;

/** Keyset cursor: the (created_at, id) pair of the last notification of a page. */
export interface NotificationCursor {
  createdAt: string;
  id: string;
}

/** Keyset predicate: rows strictly after the cursor in (created_at desc, id desc) order. */
function keysetFilter(cursor: NotificationCursor): string {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

async function fetchActors(
  client: AppSupabaseClient,
  ids: string[],
): Promise<NotificationActor[]> {
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await client
    .from("profiles")
    .select("id, username, display_name, avatar_species")
    .in("id", ids);
  if (error) {
    return softReadError(error, []);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarSpecies: row.avatar_species,
  }));
}

async function fetchGroups(
  client: AppSupabaseClient,
  ids: string[],
): Promise<NotificationGroup[]> {
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await client
    .from("groups")
    .select("id, slug, name")
    .in("id", ids);
  if (error) {
    return softReadError(error, []);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
  }));
}

async function fetchModerationActions(
  client: AppSupabaseClient,
  ids: string[],
): Promise<NotificationModeration[]> {
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await client
    .from("moderation_actions")
    .select("id, action, target_type, reason")
    .in("id", ids);
  if (error) {
    return softReadError(error, []);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    targetType: row.target_type,
    reason: row.reason,
  }));
}

/**
 * Resolves the actor profiles, groups and moderation actions one page of
 * notification rows refers to, so the page renders every row without per-row
 * queries. Missing related rows (deleted accounts, removed groups) become
 * null and the sentence builders fall back.
 */
export async function hydrateNotifications(
  client: AppSupabaseClient,
  rows: NotificationRow[],
): Promise<NotificationItem[]> {
  const actorIds = unique(
    rows.map((row) => row.actor_id).filter((id): id is string => id !== null),
  );
  const groupIds = unique(
    rows.map((row) => row.group_id).filter((id): id is string => id !== null),
  );
  const actionIds = unique(
    rows
      .map((row) => row.moderation_action_id)
      .filter((id): id is string => id !== null),
  );

  const [actors, groups, actions] = await Promise.all([
    fetchActors(client, actorIds),
    fetchGroups(client, groupIds),
    fetchModerationActions(client, actionIds),
  ]);

  const actorsById = new Map(actors.map((actor) => [actor.id, actor]));
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const actionsById = new Map(actions.map((action) => [action.id, action]));

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    postId: row.post_id,
    commentId: row.comment_id,
    groupId: row.group_id,
    moderationActionId: row.moderation_action_id,
    createdAt: row.created_at,
    readAt: row.read_at,
    actor: row.actor_id ? (actorsById.get(row.actor_id) ?? null) : null,
    group: row.group_id ? (groupsById.get(row.group_id) ?? null) : null,
    moderationAction: row.moderation_action_id
      ? (actionsById.get(row.moderation_action_id) ?? null)
      : null,
  }));
}

async function fetchNotificationsPage(
  client: AppSupabaseClient,
  recipientId: string,
  cursor: NotificationCursor | null,
): Promise<NotificationItem[]> {
  let query = client
    .from("notifications")
    .select("*")
    .eq("recipient_id", recipientId);
  if (cursor) {
    query = query.or(keysetFilter(cursor));
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(NOTIFICATIONS_PAGE_SIZE);
  if (error) {
    return softReadError(error, []);
  }
  return hydrateNotifications(client, data ?? []);
}

/** The recipient's notifications, keyset-paginated by (created_at desc, id desc). */
export function useNotifications(
  client: AppSupabaseClient | null = supabase,
): UseInfiniteQueryResult<
  InfiniteData<NotificationItem[], NotificationCursor | null>,
  SocialFailure
> {
  const { user } = useAuth();
  return useInfiniteQuery<
    NotificationItem[],
    SocialFailure,
    InfiniteData<NotificationItem[], NotificationCursor | null>,
    QueryKey,
    NotificationCursor | null
  >({
    queryKey: ["social", "notifications", "list"],
    queryFn: async ({ pageParam }) => {
      if (!client || isSocialNotInstalled() || !user) {
        return [];
      }
      return fetchNotificationsPage(client, user.id, pageParam);
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < NOTIFICATIONS_PAGE_SIZE) {
        return null;
      }
      const last = lastPage[lastPage.length - 1];
      return last ? { createdAt: last.createdAt, id: last.id } : null;
    },
    enabled: client !== null && user !== null,
    retry: false,
  });
}

/**
 * How many notifications are unread. Refreshes on window focus and every
 * UNREAD_REFRESH_MS so the header bell stays current.
 */
export function useUnreadNotificationCount(
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<number, SocialFailure> {
  const { user } = useAuth();
  return useQuery<number, SocialFailure>({
    queryKey: ["social", "notifications", "unread-count"],
    queryFn: async () => {
      if (!client || isSocialNotInstalled() || !user) {
        return 0;
      }
      const { count, error } = await client
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .is("read_at", null);
      if (error) {
        return softReadError(error, 0);
      }
      return count ?? 0;
    },
    enabled: client !== null && user !== null,
    refetchInterval: UNREAD_REFRESH_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });
}
