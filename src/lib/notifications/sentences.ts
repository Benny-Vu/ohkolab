/**
 * Pure display logic for notifications: the verb-phrase sentence and target
 * link for each notification type, plus actor labels. No I/O, no React.
 */

import type {
  NotificationActor,
  NotificationItem,
} from "@/lib/notifications/types";

/** The sentence and target link one notification renders. */
export interface NotificationSentence {
  /** The verb phrase after the actor's name, e.g. "liked your post". */
  text: string;
  /** Where the notification links to, or null when there is nothing to open. */
  to: string | null;
}

/** The actor's display name, or "Someone" when the account was deleted. */
export function actorLabel(actor: NotificationActor | null): string {
  if (!actor) {
    return "Someone";
  }
  return actor.displayName ?? actor.username;
}

/** The actor's profile path, or null for deleted accounts. */
export function actorProfilePath(
  actor: NotificationActor | null,
): string | null {
  return actor ? `/u/${actor.username}` : null;
}

/** The verb phrase and target link for one notification. */
export function describeNotification(
  item: NotificationItem,
): NotificationSentence {
  switch (item.type) {
    case "like":
      return {
        text: "liked your post",
        to: item.postId ? `/post/${item.postId}` : null,
      };
    case "comment":
      return {
        text: "commented on your post",
        to: item.postId ? `/post/${item.postId}` : null,
      };
    case "follow":
      return { text: "followed you", to: actorProfilePath(item.actor) };
    case "moderation":
      return describeModeration(item);
    case "appeal":
      return {
        text: "reviewed your appeal",
        to: item.moderationActionId
          ? `/moderation/${item.moderationActionId}`
          : null,
      };
    case "group_invite":
      return {
        text: item.group
          ? `invited you to ${item.group.name}`
          : "invited you to a group",
        to: item.group ? `/g/${item.group.slug}` : null,
      };
    default:
      return { text: "sent you a notification", to: null };
  }
}

function describeModeration(item: NotificationItem): NotificationSentence {
  const action = item.moderationAction;
  const target = action?.id ?? item.moderationActionId;
  const to = target ? `/moderation/${target}` : null;
  if (!action) {
    return { text: "took a moderation action", to };
  }
  if (action.action === "remove" && action.targetType === "post") {
    return { text: `removed your post: ${action.reason}`, to };
  }
  if (action.action === "remove" && action.targetType === "comment") {
    return { text: `removed your comment: ${action.reason}`, to };
  }
  if (action.action === "suspend") {
    return { text: `suspended your account: ${action.reason}`, to };
  }
  return { text: "took a moderation action", to };
}
