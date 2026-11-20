/**
 * Test-only helpers for the social layer tests: the shared fake Supabase
 * client from `@/test/fake-supabase` plus the row factories the social
 * tests build fixtures with. Nothing in the app imports this file.
 */

export {
  createFakeClient,
  createQueryClient,
  createWrapper,
  expectFailed,
  runMutation,
  SIGNED_IN_AUTH,
} from "@/test/fake-supabase";
export type {
  ChainRecord,
  FakeClient,
  FakeClientConfig,
  FakeResult,
} from "@/test/fake-supabase";

import type {
  AppealRow,
  FeedPostRow,
  GroupRow,
  ModerationActionRow,
  NotificationRow,
  PostImageRow,
} from "@/lib/database.types";

export function feedRow(
  partial: Partial<FeedPostRow> & { id: string },
): FeedPostRow {
  return {
    author_id: "user-1",
    body: "Hello",
    attachment: null,
    created_at: "2026-11-17T10:00:00.000Z",
    updated_at: "2026-11-17T10:00:00.000Z",
    author_username: "tester",
    author_display_name: "Test User",
    author_avatar_species: "Garchomp",
    like_count: 2,
    comment_count: 1,
    liked_by_me: false,
    language: null,
    group_id: null,
    ...partial,
  };
}

export function moderationActionRow(
  partial: Partial<ModerationActionRow> & { id: string },
): ModerationActionRow {
  return {
    target_type: "post",
    target_id: "post-1",
    target_user_id: "user-2",
    action: "remove",
    reason: "Spam",
    report_id: null,
    moderator_id: "user-1",
    content_snapshot: null,
    content_kind: null,
    suspension_id: null,
    media_paths: null,
    created_at: "2026-11-18T10:00:00.000Z",
    ...partial,
  };
}

export function appealRow(
  partial: Partial<AppealRow> & { id: string },
): AppealRow {
  return {
    moderation_action_id: "action-1",
    appellant_id: "user-2",
    message: "I disagree with this removal.",
    status: "open",
    created_at: "2026-11-18T10:05:00.000Z",
    handled_by: null,
    handled_at: null,
    ...partial,
  };
}

export function groupRow(
  partial: Partial<GroupRow> & { id: string },
): GroupRow {
  return {
    slug: "test-group",
    name: "Test Group",
    description: "A group for testing.",
    visibility: "public",
    category: null,
    language: null,
    owner_id: "user-1",
    created_at: "2026-11-18T10:00:00.000Z",
    updated_at: "2026-11-18T10:00:00.000Z",
    ...partial,
  };
}

export function notificationRow(
  partial: Partial<NotificationRow> & { id: string },
): NotificationRow {
  return {
    recipient_id: "user-1",
    actor_id: "user-2",
    type: "like",
    post_id: null,
    comment_id: null,
    group_id: null,
    moderation_action_id: null,
    battle_request_id: null,
    read_at: null,
    created_at: "2026-11-18T10:00:00.000Z",
    pushed_at: null,
    ...partial,
  };
}

/** An image row of a post, approved with a public path by default. */
export function postImageRow(
  partial: Partial<PostImageRow> & { id: string },
): PostImageRow {
  return {
    post_id: "post-1",
    author_id: "user-1",
    position: 0,
    pending_path: "user-1/post-1/image-a.webp",
    public_path: "user-1/post-1/image-a.webp",
    width: 1600,
    height: 900,
    bytes: 120000,
    status: "approved",
    screen_result: null,
    screened_at: "2026-11-19T10:01:00.000Z",
    alt: null,
    created_at: "2026-11-19T10:00:00.000Z",
    ...partial,
  };
}
