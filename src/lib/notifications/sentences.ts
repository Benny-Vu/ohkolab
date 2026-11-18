/**
 * Pure display logic for notifications: the verb-phrase sentence and target
 * link for each notification type, plus actor labels. No I/O, no React.
 * The sentences come from the dictionaries and follow the actor's name, so
 * the Japanese phrases begin with the subject particle.
 */

import { t } from "@/lib/i18n/t";
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

/** The actor's display name, or the localized "Someone" for deleted accounts. */
export function actorLabel(actor: NotificationActor | null): string {
  if (!actor) {
    return t("notifications.someone");
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
        text: t("notifications.like"),
        to: item.postId ? `/post/${item.postId}` : null,
      };
    case "comment":
      return {
        text: t("notifications.comment"),
        to: item.postId ? `/post/${item.postId}` : null,
      };
    case "follow":
      return {
        text: t("notifications.follow"),
        to: actorProfilePath(item.actor),
      };
    case "moderation":
      return describeModeration(item);
    case "appeal":
      return {
        text: t("notifications.appeal"),
        to: item.moderationActionId
          ? `/moderation/${item.moderationActionId}`
          : null,
      };
    case "group_invite":
      return {
        text: item.group
          ? t("notifications.groupInvite", { group: item.group.name })
          : t("notifications.groupInviteUnnamed"),
        to: item.group ? `/g/${item.group.slug}` : null,
      };
    default:
      return { text: t("notifications.default"), to: null };
  }
}

function describeModeration(item: NotificationItem): NotificationSentence {
  const action = item.moderationAction;
  const target = action?.id ?? item.moderationActionId;
  const to = target ? `/moderation/${target}` : null;
  if (!action) {
    return { text: t("notifications.moderationGeneric"), to };
  }
  if (action.action === "remove" && action.targetType === "post") {
    return {
      text: t("notifications.moderationPost", { reason: action.reason }),
      to,
    };
  }
  if (action.action === "remove" && action.targetType === "comment") {
    return {
      text: t("notifications.moderationComment", { reason: action.reason }),
      to,
    };
  }
  if (action.action === "suspend") {
    return {
      text: t("notifications.moderationSuspend", { reason: action.reason }),
      to,
    };
  }
  return { text: t("notifications.moderationGeneric"), to };
}
