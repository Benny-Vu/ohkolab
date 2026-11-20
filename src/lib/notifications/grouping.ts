/**
 * Pure grouping for the notifications list: consecutive "like" and
 * "comment" notifications about the same post merge into one row, so a
 * busy post reads as one line ("Ana and 4 others liked your post") instead
 * of a wall. Runs are consecutive — anything else breaks the run, so the
 * list keeps the order the events arrived in. No I/O, no React.
 */

import { t } from "@/lib/i18n/t";
import {
  describeNotification,
  type NotificationSentence,
} from "@/lib/notifications/sentences";
import type {
  NotificationActor,
  NotificationItem,
} from "@/lib/notifications/types";

/** A run of consecutive likes/comments about one post, newest first. */
export interface NotificationGroupRow {
  kind: "group";
  /** The post every merged notification is about. */
  postId: string;
  /** The merged notifications, newest first. */
  items: NotificationItem[];
}

/** One notification on its own row. */
interface NotificationSingleRow {
  kind: "single";
  item: NotificationItem;
}

/** One row of the notifications page: a single notification or a merged run. */
export type NotificationRow = NotificationSingleRow | NotificationGroupRow;

/**
 * Whether an item can merge with its neighbours: a like or comment that
 * points at a post.
 */
function isGroupable(
  item: NotificationItem,
): item is NotificationItem & { postId: string } {
  if (item.type !== "like" && item.type !== "comment") {
    return false;
  }
  return item.postId !== null;
}

/**
 * Merges consecutive likes and comments on the same post into one group
 * row. Everything else keeps its own single row. A run of one stays a
 * single row. The input order is preserved.
 */
export function groupNotifications(
  items: NotificationItem[],
): NotificationRow[] {
  const rows: NotificationRow[] = [];
  let run: NotificationItem[] = [];
  let runPostId: string | null = null;

  function flush(): void {
    const first = run[0];
    if (run.length === 1 && first) {
      rows.push({ kind: "single", item: first });
    } else if (run.length > 1 && runPostId !== null) {
      rows.push({ kind: "group", postId: runPostId, items: run });
    }
    run = [];
    runPostId = null;
  }

  for (const item of items) {
    if (!isGroupable(item)) {
      flush();
      rows.push({ kind: "single", item });
      continue;
    }
    if (runPostId !== null && runPostId === item.postId) {
      run.push(item);
      continue;
    }
    flush();
    run = [item];
    runPostId = item.postId;
  }
  flush();
  return rows;
}

/** When a row happened: the newest notification behind it. */
export function rowCreatedAt(row: NotificationRow): string {
  return row.kind === "single"
    ? row.item.createdAt
    : (row.items[0]?.createdAt ?? "");
}

/** The actor a group row is named after: the most recent one. */
export function groupLeadActor(
  row: NotificationGroupRow,
): NotificationActor | null {
  return row.items[0]?.actor ?? null;
}

/**
 * How many distinct people stand behind a group row besides its lead.
 * Deleted accounts each count once (their rows cannot be tied together).
 */
function othersBehindGroup(row: NotificationGroupRow): number {
  const lead = groupLeadActor(row);
  const identities = new Set<string>();
  for (const item of row.items) {
    identities.add(item.actor ? `user:${item.actor.id}` : `deleted:${item.id}`);
  }
  identities.delete(
    lead ? `user:${lead.id}` : `deleted:${row.items[0]?.id ?? ""}`,
  );
  return identities.size;
}

/**
 * The sentence and target link a merged row renders: "and 4 others liked
 * your post" style, counting distinct actors. A run that came from one
 * person reads as that person's plain sentence.
 */
export function describeGroupedNotification(
  row: NotificationGroupRow,
): NotificationSentence {
  const first = row.items[0];
  if (!first) {
    return { text: t("notifications.default"), to: `/post/${row.postId}` };
  }
  const others = othersBehindGroup(row);
  const to = `/post/${row.postId}`;
  if (others === 0) {
    return describeNotification(first);
  }
  const hasLike = row.items.some((item) => item.type === "like");
  const hasComment = row.items.some((item) => item.type === "comment");
  if (hasLike && hasComment) {
    return {
      text: t(
        others === 1
          ? "notifications.groupMixedOne"
          : "notifications.groupMixedMany",
        { n: others },
      ),
      to,
    };
  }
  if (hasComment) {
    return {
      text: t(
        others === 1
          ? "notifications.groupCommentsOne"
          : "notifications.groupCommentsMany",
        { n: others },
      ),
      to,
    };
  }
  return {
    text: t(
      others === 1
        ? "notifications.groupLikesOne"
        : "notifications.groupLikesMany",
      { n: others },
    ),
    to,
  };
}
