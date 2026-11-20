/**
 * Write hooks for the social layer: posts, comments, likes, follows, blocks
 * and reports. Mutations validate first, never throw, and return a
 * SocialResult so screens can react to rate limits, suspensions and other
 * mapped failures without parsing database errors.
 */

import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
  type UseMutationResult,
} from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import type {
  CommentRow,
  FeedPostRow,
  Json,
  PostRow,
} from "@/lib/database.types";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import type { FollowCounts, SocialComment } from "@/lib/social/queries";

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
import { track } from "@/lib/telemetry/analytics";
import {
  asPostLanguage,
  normalizeCommentBody,
  normalizePostBody,
  normalizeReportDetails,
  validateAttachment,
  validateCommentBody,
  validatePostBody,
  validateReportDetails,
  validateReportReason,
  validateReportTarget,
  type PostLanguage,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/social/validation";

export interface CreatePostInput {
  body: string;
  attachment?: Json | null;
  /** The group to post into; null or omitted posts to the main feed. */
  groupId?: string | null;
  /** The post's language tag; null or omitted leaves the post untagged. */
  language?: PostLanguage | null;
}

export interface UpdatePostInput {
  postId: string;
  body: string;
}

export interface CreateCommentInput {
  postId: string;
  body: string;
}

export interface DeleteCommentInput {
  commentId: string;
  postId: string;
}

/**
 * A comment row while its create is still in flight: the optimistic copy
 * `useCreateComment` adds to the comments cache. Screens render it dimmed
 * with a spinner and without actions until the server confirms.
 */
export interface PendingComment extends SocialComment {
  pending: true;
}

/** True while the comment is the optimistic copy of a create in flight. */
export function isPendingComment(
  comment: SocialComment,
): comment is PendingComment {
  return (comment as Partial<PendingComment>).pending === true;
}

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

/** Creates a post as the signed-in user. */
export function useCreatePost(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<PostRow>, SocialFailure, CreatePostInput> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<PostRow>, SocialFailure, CreatePostInput>({
    mutationFn: async (input): Promise<SocialResult<PostRow>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      const body = normalizePostBody(input.body);
      const bodyError = validatePostBody(body);
      if (bodyError) return socialFail("invalid_input", bodyError);
      const attachment = input.attachment ?? null;
      const attachmentError = validateAttachment(attachment);
      if (attachmentError) return socialFail("invalid_input", attachmentError);
      const groupId = input.groupId ?? null;
      const { data, error } = await client
        .from("posts")
        .insert({
          author_id: me,
          body,
          attachment,
          group_id: groupId,
          language: asPostLanguage(input.language),
        })
        .select("*")
        .single();
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed(data);
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: ["social", "feed"] });
      void queryClient.invalidateQueries({
        queryKey: ["social", "group-feed"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social", "author-posts"],
      });
    },
  });
}

/** Edits the body of one of the user's own posts. */
export function useUpdatePost(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<PostRow>, SocialFailure, UpdatePostInput> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<PostRow>, SocialFailure, UpdatePostInput>({
    mutationFn: async (input): Promise<SocialResult<PostRow>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      const body = normalizePostBody(input.body);
      const bodyError = validatePostBody(body);
      if (bodyError) return socialFail("invalid_input", bodyError);
      const { data, error } = await client
        .from("posts")
        .update({ body })
        .eq("id", input.postId)
        .eq("author_id", me)
        .select("*")
        .single();
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed(data);
    },
    onSuccess: (result, input) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: ["social", "feed"] });
      void queryClient.invalidateQueries({
        queryKey: ["social", "author-posts"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social", "post", input.postId],
      });
    },
  });
}

/** Deletes a post (the author or a moderator, decided by the database). */
export function useDeletePost(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<undefined>, SocialFailure, string> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, string>({
    mutationFn: async (postId): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      const { data, error } = await client
        .from("posts")
        .delete()
        .eq("id", postId)
        .select("id");
      if (error) return { ok: false, error: describeWriteError(error) };
      if (!data || data.length === 0) return socialFail("not_found");
      return socialSucceed();
    },
    onSuccess: (result, postId) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: ["social", "feed"] });
      void queryClient.invalidateQueries({
        queryKey: ["social", "group-feed"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social", "author-posts"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social", "post", postId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social", "comments", postId],
      });
    },
  });
}

/** Snapshots restored when an optimistic comment write has to be rolled back. */
export interface CommentSnapshot {
  snapshots: Array<[QueryKey, unknown]>;
}

/**
 * Restores the cached rows an optimistic update captured before mutating.
 * Shared by every rollback path: comment create/delete, like and follow.
 */
function rollbackSnapshots(
  queryClient: ReturnType<typeof useQueryClient>,
  context: { snapshots: Array<[QueryKey, unknown]> } | undefined,
): void {
  if (!context) return;
  for (const [key, data] of context.snapshots) {
    queryClient.setQueryData(key, data);
  }
}

/**
 * Applies a comment-count change to every cached copy of the post, no-op
 * elsewhere. Shared by the optimistic create and delete paths.
 */
function mapCachedCommentCount(
  data: unknown,
  postId: string,
  delta: number,
): unknown {
  const withCount = (row: FeedPostRow): FeedPostRow => ({
    ...row,
    comment_count: Math.max(0, row.comment_count + delta),
  });
  if (isInfinitePostPages(data)) {
    return {
      ...data,
      pages: data.pages.map((page) =>
        page.map((row) => (row.id === postId ? withCount(row) : row)),
      ),
    };
  }
  if (isFeedPostRow(data) && data.id === postId) {
    return withCount(data);
  }
  return data;
}

/** Comments on a post as the signed-in user. */
export function useCreateComment(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<CommentRow>,
  SocialFailure,
  CreateCommentInput,
  CommentSnapshot
> {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<CommentRow>,
    SocialFailure,
    CreateCommentInput,
    CommentSnapshot
  >({
    mutationFn: async (input): Promise<SocialResult<CommentRow>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      const body = normalizeCommentBody(input.body);
      const bodyError = validateCommentBody(body);
      if (bodyError) return socialFail("invalid_input", bodyError);
      const { data, error } = await client
        .from("comments")
        .insert({ post_id: input.postId, author_id: me, body })
        .select("*")
        .single();
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed(data);
    },
    onMutate: (input) => {
      const me = user?.id ?? null;
      const body = input ? normalizeCommentBody(input.body) : "";
      if (
        !me ||
        !input ||
        isSocialNotInstalled() ||
        !client ||
        validateCommentBody(body)
      ) {
        // The mutation will fail without a write; nothing to show yet.
        return { snapshots: [] };
      }
      const snapshots = queryClient.getQueriesData({ queryKey: ["social"] });
      const optimistic: PendingComment = {
        id: `pending-${crypto.randomUUID()}`,
        postId: input.postId,
        authorId: me,
        body,
        createdAt: new Date().toISOString(),
        author: profile
          ? {
              id: me,
              username: profile.username,
              displayName: profile.displayName,
              avatarSpecies: profile.avatarSpecies,
            }
          : null,
        pending: true,
      };
      for (const [key, data] of snapshots) {
        if (
          key[0] === "social" &&
          key[1] === "comments" &&
          key[2] === input.postId
        ) {
          queryClient.setQueryData<SocialComment[]>(key, [
            ...((data as SocialComment[] | undefined) ?? []),
            optimistic,
          ]);
        } else {
          queryClient.setQueryData(
            key,
            mapCachedCommentCount(data, input.postId, 1),
          );
        }
      }
      return { snapshots };
    },
    onSuccess: (result, _input, context) => {
      if (!result.ok) {
        // The optimistic comment (and count) disappears again.
        rollbackSnapshots(queryClient, context);
        return;
      }
      track("comment_created");
    },
    onSettled: (_result, _error, input) => {
      if (!input) return;
      void queryClient.invalidateQueries({
        queryKey: ["social", "comments", input.postId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social", "post", input.postId],
      });
      void queryClient.invalidateQueries({ queryKey: ["social", "feed"] });
      void queryClient.invalidateQueries({
        queryKey: ["social", "author-posts"],
      });
    },
  });
}

/** Deletes one of the user's own comments. */
export function useDeleteComment(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  DeleteCommentInput,
  CommentSnapshot
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    DeleteCommentInput,
    CommentSnapshot
  >({
    mutationFn: async (input): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      const { data, error } = await client
        .from("comments")
        .delete()
        .eq("id", input.commentId)
        .select("id");
      if (error) return { ok: false, error: describeWriteError(error) };
      if (!data || data.length === 0) return socialFail("not_found");
      return socialSucceed();
    },
    onMutate: (input) => {
      const me = user?.id ?? null;
      if (!me || !input || isSocialNotInstalled() || !client) {
        return { snapshots: [] };
      }
      const snapshots = queryClient.getQueriesData({ queryKey: ["social"] });
      for (const [key, data] of snapshots) {
        if (
          key[0] === "social" &&
          key[1] === "comments" &&
          key[2] === input.postId
        ) {
          queryClient.setQueryData<SocialComment[]>(
            key,
            ((data as SocialComment[] | undefined) ?? []).filter(
              (comment) => comment.id !== input.commentId,
            ),
          );
        } else {
          queryClient.setQueryData(
            key,
            mapCachedCommentCount(data, input.postId, -1),
          );
        }
      }
      return { snapshots };
    },
    onSuccess: (result, _input, context) => {
      if (!result.ok && context) {
        // The comment (and count) come back until the server agrees.
        rollbackSnapshots(queryClient, context);
      }
    },
    onSettled: (_result, _error, input) => {
      if (!input) return;
      void queryClient.invalidateQueries({
        queryKey: ["social", "comments", input.postId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social", "post", input.postId],
      });
      void queryClient.invalidateQueries({ queryKey: ["social", "feed"] });
      void queryClient.invalidateQueries({
        queryKey: ["social", "author-posts"],
      });
    },
  });
}

function isFeedPostRow(value: unknown): value is FeedPostRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row["like_count"] === "number" &&
    typeof row["liked_by_me"] === "boolean"
  );
}

function isInfinitePostPages(
  value: unknown,
): value is InfiniteData<FeedPostRow[]> {
  if (typeof value !== "object" || value === null) return false;
  return Array.isArray((value as { pages?: unknown }).pages);
}

function flipLiked(row: FeedPostRow): FeedPostRow {
  return row.liked_by_me
    ? {
        ...row,
        liked_by_me: false,
        like_count: Math.max(0, row.like_count - 1),
      }
    : { ...row, liked_by_me: true, like_count: row.like_count + 1 };
}

/** Applies the like flip to every cached copy of the post, no-op elsewhere. */
function mapCachedPost(data: unknown, postId: string): unknown {
  if (isInfinitePostPages(data)) {
    return {
      ...data,
      pages: data.pages.map((page) =>
        page.map((row) => (row.id === postId ? flipLiked(row) : row)),
      ),
    };
  }
  if (isFeedPostRow(data) && data.id === postId) {
    return flipLiked(data);
  }
  return data;
}

/** Snapshots restored when an optimistic like has to be rolled back. */
export interface LikeSnapshot {
  snapshots: Array<[QueryKey, unknown]>;
}

/** Toggles the signed-in user's like on a post, optimistically. */
export function useToggleLike(
  postId: string,
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  void,
  LikeSnapshot
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    void,
    LikeSnapshot
  >({
    mutationFn: async (): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      const { data: existing, error: checkError } = await client
        .from("post_likes")
        .select("post_id, user_id")
        .eq("post_id", postId)
        .eq("user_id", me)
        .maybeSingle();
      if (checkError)
        return { ok: false, error: describeWriteError(checkError) };
      if (existing) {
        const { error } = await client
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", me);
        if (error) return { ok: false, error: describeWriteError(error) };
      } else {
        const { error } = await client
          .from("post_likes")
          .insert({ post_id: postId, user_id: me });
        if (error) return { ok: false, error: describeWriteError(error) };
        track("post_liked");
      }
      return socialSucceed();
    },
    onMutate: () => {
      if (!user) {
        return { snapshots: [] };
      }
      const snapshots = queryClient.getQueriesData({ queryKey: ["social"] });
      for (const [key, data] of snapshots) {
        queryClient.setQueryData(key, mapCachedPost(data, postId));
      }
      return { snapshots };
    },
    onSuccess: (result, _variables, context) => {
      if (!result.ok && context) {
        rollbackSnapshots(queryClient, context);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["social", "feed"] });
      void queryClient.invalidateQueries({
        queryKey: ["social", "author-posts"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social", "post", postId],
      });
    },
  });
}

/** Snapshots restored when an optimistic follow toggle has to be rolled back. */
export interface FollowSnapshot {
  snapshots: Array<[QueryKey, unknown]>;
}

/** Adjusts one side of the cached follow counts for the given user. */
function adjustCachedFollowCounts(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  field: "followers" | "following",
  delta: number,
): void {
  for (const [key, data] of queryClient.getQueriesData({
    queryKey: ["social", "follow-counts"],
  })) {
    if (key[2] !== userId) continue;
    if (typeof data !== "object" || data === null) continue;
    const counts = data as FollowCounts;
    queryClient.setQueryData<FollowCounts>(key, {
      ...counts,
      [field]: Math.max(0, counts[field] + delta),
    });
  }
}

/** Toggles following the given user, optimistically. */
export function useToggleFollow(
  userId: string,
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  void,
  FollowSnapshot
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    void,
    FollowSnapshot
  >({
    mutationFn: async (): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      if (userId === me)
        return socialFail("invalid_input", "You cannot follow yourself.");
      const { data: existing, error: checkError } = await client
        .from("follows")
        .select("follower_id, followee_id")
        .eq("follower_id", me)
        .eq("followee_id", userId)
        .maybeSingle();
      if (checkError)
        return { ok: false, error: describeWriteError(checkError) };
      if (existing) {
        const { error } = await client
          .from("follows")
          .delete()
          .eq("follower_id", me)
          .eq("followee_id", userId);
        if (error) return { ok: false, error: describeWriteError(error) };
      } else {
        const { error } = await client
          .from("follows")
          .insert({ follower_id: me, followee_id: userId });
        if (error) return { ok: false, error: describeWriteError(error) };
        track("user_followed");
      }
      return socialSucceed();
    },
    onMutate: () => {
      const me = user?.id ?? null;
      if (!me || userId === me) {
        return { snapshots: [] };
      }
      const snapshots = queryClient.getQueriesData({ queryKey: ["social"] });
      const stateKey: QueryKey = ["social", "follow-state", me, userId];
      const current = queryClient.getQueryData<boolean>(stateKey);
      if (current !== undefined) {
        queryClient.setQueryData(stateKey, !current);
      }
      // Without a per-row cache, the batched follow-states maps (the
      // notifications rows) decide whether the viewer follows this user.
      const batched = queryClient.getQueriesData({
        queryKey: ["social", "follow-states", me],
      });
      let wasFollowing = current;
      if (wasFollowing === undefined) {
        for (const [, data] of batched) {
          if (data instanceof Map && data.has(userId)) {
            wasFollowing = true;
            break;
          }
        }
      }
      if (wasFollowing !== undefined) {
        // Following → unfollow takes one away; the other way adds one.
        const delta = wasFollowing ? -1 : 1;
        adjustCachedFollowCounts(queryClient, userId, "followers", delta);
        adjustCachedFollowCounts(queryClient, me, "following", delta);
        // Flip the id in every batched map — a new Map each time, so
        // consumers re-render on the change.
        for (const [key, data] of batched) {
          if (!(data instanceof Map)) continue;
          const next = new Map(data);
          if (wasFollowing) {
            next.delete(userId);
          } else {
            next.set(userId, true);
          }
          queryClient.setQueryData(key, next);
        }
      }
      return { snapshots };
    },
    onSuccess: (result, _variables, context) => {
      if (!result.ok && context) {
        rollbackSnapshots(queryClient, context);
      }
    },
    onSettled: () => {
      const me = user?.id ?? null;
      void queryClient.invalidateQueries({
        queryKey: ["social", "follow-state"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social", "follow-states"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social", "follow-counts"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social", "followers", userId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social", "following", me ?? ""],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social", "feed", "following"],
      });
    },
  });
}

/** Toggles blocking the given user. */
export function useToggleBlock(
  userId: string,
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
      if (userId === me)
        return socialFail("invalid_input", "You cannot block yourself.");
      const { data: existing, error: checkError } = await client
        .from("blocks")
        .select("blocker_id, blocked_id")
        .eq("blocker_id", me)
        .eq("blocked_id", userId)
        .maybeSingle();
      if (checkError)
        return { ok: false, error: describeWriteError(checkError) };
      if (existing) {
        const { error } = await client
          .from("blocks")
          .delete()
          .eq("blocker_id", me)
          .eq("blocked_id", userId);
        if (error) return { ok: false, error: describeWriteError(error) };
      } else {
        const { error } = await client
          .from("blocks")
          .insert({ blocker_id: me, blocked_id: userId });
        if (error) return { ok: false, error: describeWriteError(error) };
      }
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: ["social", "blocks"] });
      void queryClient.invalidateQueries({ queryKey: ["social", "feed"] });
    },
  });
}

/** Files a report as the signed-in user. */
export function useCreateReport(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  CreateReportInput
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, CreateReportInput>(
    {
      mutationFn: async (input): Promise<SocialResult<undefined>> => {
        if (isSocialNotInstalled()) return socialFail("not_installed");
        if (!client) return socialFail("not_configured");
        const me = user?.id ?? null;
        if (!me) return socialFail("not_signed_in");
        const targetError = validateReportTarget({
          type: input.targetType,
          id: input.targetId,
        });
        if (targetError) return socialFail("invalid_input", targetError);
        const reasonError = validateReportReason(input.reason);
        if (reasonError) return socialFail("invalid_input", reasonError);
        const details = normalizeReportDetails(input.details ?? "");
        const detailsError = validateReportDetails(details ?? "");
        if (detailsError) return socialFail("invalid_input", detailsError);
        const { error } = await client.from("reports").insert({
          reporter_id: me,
          target_type: input.targetType,
          target_id: input.targetId,
          reason: input.reason,
          details,
        });
        if (error) return { ok: false, error: describeWriteError(error) };
        return socialSucceed();
      },
      onSuccess: (result) => {
        if (result.ok) {
          void queryClient.invalidateQueries({
            queryKey: ["social", "reports"],
          });
        }
      },
    },
  );
}
