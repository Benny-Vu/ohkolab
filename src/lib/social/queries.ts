/**
 * Read hooks for the social layer: feeds, posts, comments, the follow graph,
 * blocks and moderation data. Reads fail soft (empty data, no error state)
 * while the social tables are missing, and surface mapped SocialFailure
 * errors for anything else.
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
import type { FeedPostRow, ReportRow } from "@/lib/database.types";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

import { isSocialNotInstalled, softReadError } from "@/lib/social/availability";
import type { SocialFailure } from "@/lib/social/errors";
import type { PostLanguage, ReportStatus } from "@/lib/social/validation";

/** Page size for the keyset-paginated feeds. */
export const FEED_PAGE_SIZE = 20;

/** What the feed is filtered by: one tagged language, or everything. */
export type FeedLanguage = "all" | PostLanguage;

/** Keyset cursor: the (created_at, id) pair of the last post of a page. */
export interface FeedCursor {
  createdAt: string;
  id: string;
}

/** Profile fields shown next to social content. */
export interface SocialProfileSummary {
  id: string;
  username: string;
  displayName: string | null;
  avatarSpecies: string | null;
}

/** A comment with its author resolved for display. */
export interface SocialComment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: SocialProfileSummary | null;
}

/** Follower and following counts for one user. */
export interface FollowCounts {
  followers: number;
  following: number;
}

function cursorOf(row: FeedPostRow): FeedCursor {
  return { createdAt: row.created_at, id: row.id };
}

/** Keyset predicate: rows strictly after the cursor in (created_at desc, id desc) order. */
function keysetFilter(cursor: FeedCursor): string {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

async function fetchFeedPage(
  client: AppSupabaseClient,
  viewerId: string | null,
  kind: "latest" | "following",
  language: FeedLanguage,
  cursor: FeedCursor | null,
): Promise<FeedPostRow[]> {
  let query = client.from("feed_posts").select("*").is("group_id", null);
  if (language !== "all") {
    query = query.eq("language", language);
  }
  if (kind === "following") {
    if (!viewerId) {
      return [];
    }
    const { data: followRows, error } = await client
      .from("follows")
      .select("followee_id")
      .eq("follower_id", viewerId);
    if (error) {
      return softReadError(error, []);
    }
    const followeeIds = (followRows ?? []).map((row) => row.followee_id);
    if (followeeIds.length === 0) {
      return [];
    }
    query = query.in("author_id", followeeIds);
  }
  if (cursor) {
    query = query.or(keysetFilter(cursor));
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(FEED_PAGE_SIZE);
  if (error) {
    return softReadError(error, []);
  }
  return data ?? [];
}

async function fetchGroupFeedPage(
  client: AppSupabaseClient,
  groupId: string,
  cursor: FeedCursor | null,
): Promise<FeedPostRow[]> {
  let query = client.from("feed_posts").select("*").eq("group_id", groupId);
  if (cursor) {
    query = query.or(keysetFilter(cursor));
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(FEED_PAGE_SIZE);
  if (error) {
    return softReadError(error, []);
  }
  return data ?? [];
}

/**
 * The community feed, keyset-paginated by (created_at desc, id desc).
 * `language` filters the feed to one tagged language; "all" shows
 * everything, untagged posts included.
 */
export function useFeed(
  kind: "latest" | "following",
  language: FeedLanguage,
  client: AppSupabaseClient | null = supabase,
): UseInfiniteQueryResult<
  InfiniteData<FeedPostRow[], FeedCursor | null>,
  SocialFailure
> {
  const { user } = useAuth();
  return useInfiniteQuery<
    FeedPostRow[],
    SocialFailure,
    InfiniteData<FeedPostRow[], FeedCursor | null>,
    QueryKey,
    FeedCursor | null
  >({
    queryKey: ["social", "feed", kind, language],
    queryFn: async ({ pageParam }) => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      return fetchFeedPage(client, user?.id ?? null, kind, language, pageParam);
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < FEED_PAGE_SIZE) {
        return null;
      }
      const last = lastPage[lastPage.length - 1];
      return last ? cursorOf(last) : null;
    },
    enabled: client !== null && (kind === "latest" || user !== null),
    retry: false,
  });
}

/**
 * One group's feed, keyset-paginated by (created_at desc, id desc). The
 * posts policies already hide invite-only group posts from non-members.
 */
export function useGroupFeed(
  groupId: string,
  client: AppSupabaseClient | null = supabase,
): UseInfiniteQueryResult<
  InfiniteData<FeedPostRow[], FeedCursor | null>,
  SocialFailure
> {
  return useInfiniteQuery<
    FeedPostRow[],
    SocialFailure,
    InfiniteData<FeedPostRow[], FeedCursor | null>,
    QueryKey,
    FeedCursor | null
  >({
    queryKey: ["social", "group-feed", groupId],
    queryFn: async ({ pageParam }) => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      return fetchGroupFeedPage(client, groupId, pageParam);
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < FEED_PAGE_SIZE) {
        return null;
      }
      const last = lastPage[lastPage.length - 1];
      return last ? cursorOf(last) : null;
    },
    enabled: client !== null && groupId !== "",
    retry: false,
  });
}

/** One author's posts, keyset-paginated, with counts and profile fields. */
export function useAuthorPosts(
  userId: string,
  client: AppSupabaseClient | null = supabase,
): UseInfiniteQueryResult<
  InfiniteData<FeedPostRow[], FeedCursor | null>,
  SocialFailure
> {
  return useInfiniteQuery<
    FeedPostRow[],
    SocialFailure,
    InfiniteData<FeedPostRow[], FeedCursor | null>,
    QueryKey,
    FeedCursor | null
  >({
    queryKey: ["social", "author-posts", userId],
    queryFn: async ({ pageParam }) => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      let query = client.from("feed_posts").select("*").eq("author_id", userId);
      if (pageParam) {
        query = query.or(keysetFilter(pageParam));
      }
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(FEED_PAGE_SIZE);
      if (error) {
        return softReadError(error, []);
      }
      return data ?? [];
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < FEED_PAGE_SIZE) {
        return null;
      }
      const last = lastPage[lastPage.length - 1];
      return last ? cursorOf(last) : null;
    },
    enabled: client !== null && userId !== "",
    retry: false,
  });
}

/** A single post, with author fields and counts. Null when it is not visible. */
export function usePost(
  postId: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<FeedPostRow | null, SocialFailure> {
  return useQuery<FeedPostRow | null, SocialFailure>({
    queryKey: ["social", "post", postId],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return null;
      }
      const { data, error } = await client
        .from("feed_posts")
        .select("*")
        .eq("id", postId)
        .maybeSingle();
      if (error) {
        return softReadError(error, null);
      }
      return data;
    },
    enabled: client !== null && postId !== "",
    retry: false,
  });
}

async function fetchProfileSummaries(
  client: AppSupabaseClient,
  ids: string[],
): Promise<SocialProfileSummary[]> {
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

/** The comments of one post, oldest first, with their authors resolved. */
export function useComments(
  postId: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<SocialComment[], SocialFailure> {
  return useQuery<SocialComment[], SocialFailure>({
    queryKey: ["social", "comments", postId],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      const { data, error } = await client
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (error) {
        return softReadError(error, []);
      }
      const rows = data ?? [];
      const authorIds = [...new Set(rows.map((row) => row.author_id))];
      const authors = await fetchProfileSummaries(client, authorIds);
      const authorsById = new Map(authors.map((author) => [author.id, author]));
      return rows.map((row) => ({
        id: row.id,
        postId: row.post_id,
        authorId: row.author_id,
        body: row.body,
        createdAt: row.created_at,
        author: authorsById.get(row.author_id) ?? null,
      }));
    },
    enabled: client !== null && postId !== "",
    retry: false,
  });
}

/** Whether the signed-in user follows the given user. */
export function useFollowState(
  userId: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<boolean, SocialFailure> {
  const { user } = useAuth();
  return useQuery<boolean, SocialFailure>({
    queryKey: ["social", "follow-state", user?.id ?? null, userId],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return false;
      }
      const me = user?.id ?? null;
      if (!me) {
        return false;
      }
      const { data, error } = await client
        .from("follows")
        .select("follower_id")
        .eq("follower_id", me)
        .eq("followee_id", userId)
        .maybeSingle();
      if (error) {
        return softReadError(error, false);
      }
      return data !== null;
    },
    enabled: client !== null && user !== null && userId !== "",
    retry: false,
  });
}

/**
 * Whether the signed-in user follows each of the given users, in ONE
 * query — the batched form of useFollowState for lists (the follow-back
 * rows on the notifications page). Users not in the map are not followed.
 */
export function useFollowStates(
  userIds: string[],
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<Map<string, boolean>, SocialFailure> {
  const { user } = useAuth();
  return useQuery<Map<string, boolean>, SocialFailure>({
    queryKey: [
      "social",
      "follow-states",
      user?.id ?? null,
      [...new Set(userIds)].sort(),
    ],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return new Map();
      }
      const me = user?.id ?? null;
      if (!me || userIds.length === 0) {
        return new Map();
      }
      const { data, error } = await client
        .from("follows")
        .select("followee_id")
        .eq("follower_id", me)
        .in("followee_id", userIds);
      if (error) {
        return softReadError(error, new Map());
      }
      return new Map((data ?? []).map((row) => [row.followee_id, true]));
    },
    enabled: client !== null && user !== null && userIds.length > 0,
    retry: false,
  });
}

/** Follower and following counts for one user. */
export function useFollowCounts(
  userId: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<FollowCounts, SocialFailure> {
  return useQuery<FollowCounts, SocialFailure>({
    queryKey: ["social", "follow-counts", userId],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return { followers: 0, following: 0 };
      }
      const [followersRes, followingRes] = await Promise.all([
        client
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("followee_id", userId),
        client
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", userId),
      ]);
      if (followersRes.error) {
        return softReadError(followersRes.error, {
          followers: 0,
          following: 0,
        });
      }
      if (followingRes.error) {
        return softReadError(followingRes.error, {
          followers: 0,
          following: 0,
        });
      }
      return {
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
      };
    },
    enabled: client !== null && userId !== "",
    retry: false,
  });
}

async function fetchFollowList(
  client: AppSupabaseClient,
  userId: string,
  direction: "followers" | "following",
): Promise<SocialProfileSummary[]> {
  const filterColumn =
    direction === "followers" ? "followee_id" : "follower_id";
  const idColumn = direction === "followers" ? "follower_id" : "followee_id";
  const { data, error } = await client
    .from("follows")
    .select("*")
    .eq(filterColumn, userId)
    .order("created_at", { ascending: false })
    .order(idColumn, { ascending: false });
  if (error) {
    return softReadError(error, []);
  }
  const ids = (data ?? []).map((row) => row[idColumn]);
  const profiles = await fetchProfileSummaries(client, ids);
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );
  return ids
    .map((id) => profilesById.get(id))
    .filter(
      (profile): profile is SocialProfileSummary => profile !== undefined,
    );
}

/** The users who follow the given user, newest follow first. */
export function useFollowers(
  userId: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<SocialProfileSummary[], SocialFailure> {
  return useQuery<SocialProfileSummary[], SocialFailure>({
    queryKey: ["social", "followers", userId],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      return fetchFollowList(client, userId, "followers");
    },
    enabled: client !== null && userId !== "",
    retry: false,
  });
}

/** The users the given user follows, newest follow first. */
export function useFollowing(
  userId: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<SocialProfileSummary[], SocialFailure> {
  return useQuery<SocialProfileSummary[], SocialFailure>({
    queryKey: ["social", "following", userId],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      return fetchFollowList(client, userId, "following");
    },
    enabled: client !== null && userId !== "",
    retry: false,
  });
}

/** The ids of the users the signed-in user has blocked. */
export function useBlocks(
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<string[], SocialFailure> {
  const { user } = useAuth();
  return useQuery<string[], SocialFailure>({
    queryKey: ["social", "blocks", user?.id ?? null],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      const me = user?.id ?? null;
      if (!me) {
        return [];
      }
      const { data, error } = await client
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", me);
      if (error) {
        return softReadError(error, []);
      }
      return (data ?? []).map((row) => row.blocked_id);
    },
    enabled: client !== null && user !== null,
    retry: false,
  });
}

// Re-exported for existing importers: the hook itself now lives in its own
// module so the entry chunk does not pull all of `queries.ts` in.
export { useIsModerator } from "@/lib/social/moderator-status";

/** Moderation queue: reports with the given status, newest first. */
export function useReports(
  status: ReportStatus,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<ReportRow[], SocialFailure> {
  const { user } = useAuth();
  return useQuery<ReportRow[], SocialFailure>({
    queryKey: ["social", "reports", status],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      const { data, error } = await client
        .from("reports")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });
      if (error) {
        return softReadError(error, []);
      }
      return data ?? [];
    },
    enabled: client !== null && user !== null,
    retry: false,
  });
}
