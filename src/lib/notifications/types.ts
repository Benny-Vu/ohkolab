/**
 * Display types for notifications: one row of the `notifications` table with
 * the actor profile, group and moderation action it refers to resolved for
 * display. Related rows can be null (deleted accounts, removed groups); the
 * sentence builders fall back to text that still reads naturally.
 */

/** The profile of the user who caused a notification. */
export interface NotificationActor {
  id: string;
  username: string;
  displayName: string | null;
  avatarSpecies: string | null;
}

/** The group a group_invite notification points at. */
export interface NotificationGroup {
  id: string;
  slug: string;
  name: string;
}

/** The moderation action a moderation or appeal notification points at. */
export interface NotificationModeration {
  id: string;
  action: string;
  targetType: string;
  reason: string;
}

/** One notification ready to render. */
export interface NotificationItem {
  id: string;
  type: string;
  postId: string | null;
  commentId: string | null;
  groupId: string | null;
  moderationActionId: string | null;
  createdAt: string;
  readAt: string | null;
  actor: NotificationActor | null;
  group: NotificationGroup | null;
  moderationAction: NotificationModeration | null;
}
