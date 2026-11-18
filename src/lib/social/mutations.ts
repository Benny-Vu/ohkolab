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
  normalizeCommentBody,
  normalizePostBody,
  normalizeReportDetails,
  validateAttachment,
  validateCommentBody,
  validatePostBody,
  validateReportDetails,
  validateReportReason,
  validateReportTarget,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/social/validation";

export interface CreatePostInput {
  body: string;
  attachment?: Json | null;
  /** The group to post into; null or omitted posts to the main feed. */
  groupId?: string | null;
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
        .insert({ author_id: me, body, attachment, group_id: groupId })
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

/** Comments on a post as the signed-in user. */
export function useCreateComment(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<CommentRow>,
  SocialFailure,
  CreateCommentInput
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<CommentRow>,
    SocialFailure,
    CreateCommentInput
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
    onSuccess: (result, input) => {
      if (!result.ok) return;
      track("comment_created");
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
  DeleteCommentInput
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    DeleteCommentInput
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
    onSuccess: (result, input) => {
      if (!result.ok) return;
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
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(key, data);
        }
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

/** Toggles following the given user. */
export function useToggleFollow(
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
    onSuccess: (result) => {
      if (!result.ok) return;
      const me = user?.id ?? null;
      void queryClient.invalidateQueries({
        queryKey: ["social", "follow-state"],
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
