import { describe, expect, it } from "vitest";

import { setLocale } from "@/lib/i18n/locale";
import { loadJapaneseDictionary } from "@/lib/i18n/ja-loader";
import {
  describeGroupedNotification,
  groupLeadActor,
  groupNotifications,
  rowCreatedAt,
  type NotificationGroupRow,
} from "@/lib/notifications/grouping";
import type { NotificationItem } from "@/lib/notifications/types";

function actor(id: string, name: string) {
  return {
    id,
    username: name.toLowerCase(),
    displayName: name,
    avatarSpecies: null,
  };
}

function item(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: "n-1",
    type: "like",
    postId: "post-1",
    commentId: null,
    groupId: null,
    moderationActionId: null,
    createdAt: "2026-11-18T10:00:00.000Z",
    readAt: null,
    actor: actor("user-2", "Ana"),
    group: null,
    moderationAction: null,
    ...overrides,
  };
}

/** The ids of every row, deepest first for groups, in display order. */
function rowIds(rows: ReturnType<typeof groupNotifications>): string[][] {
  return rows.map((row) =>
    row.kind === "single" ? [row.item.id] : row.items.map((i) => i.id),
  );
}

describe("groupNotifications", () => {
  it("merges consecutive likes on the same post into one row", () => {
    const rows = groupNotifications([
      item({ id: "n-1", actor: actor("user-2", "Ana") }),
      item({ id: "n-2", actor: actor("user-3", "Bo") }),
      item({ id: "n-3", actor: actor("user-4", "Cid") }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "group", postId: "post-1" });
    expect(rowIds(rows)).toEqual([["n-1", "n-2", "n-3"]]);
  });

  it("merges consecutive likes and comments on the same post", () => {
    const rows = groupNotifications([
      item({ id: "n-1", type: "like" }),
      item({ id: "n-2", type: "comment" }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "group", postId: "post-1" });
  });

  it("breaks the run on a different post", () => {
    const rows = groupNotifications([
      item({ id: "n-1", postId: "post-1" }),
      item({ id: "n-2", postId: "post-2" }),
      item({ id: "n-3", postId: "post-1" }),
    ]);

    // Three runs, each of one: no row ever merges across another post.
    expect(rows.map((row) => row.kind)).toEqual(["single", "single", "single"]);
    expect(rowIds(rows)).toEqual([["n-1"], ["n-2"], ["n-3"]]);
  });

  it("breaks the run on a notification that is not about a post", () => {
    const rows = groupNotifications([
      item({ id: "n-1" }),
      item({ id: "n-2", type: "follow", postId: null, actor: actor("u", "X") }),
      item({ id: "n-3" }),
    ]);

    expect(rowIds(rows)).toEqual([["n-1"], ["n-2"], ["n-3"]]);
  });

  it("keeps likes without a post on their own row", () => {
    const rows = groupNotifications([
      item({ id: "n-1", postId: null }),
      item({ id: "n-2", postId: null }),
    ]);

    expect(rows.map((row) => row.kind)).toEqual(["single", "single"]);
  });

  it("keeps the input order across singles and groups", () => {
    const rows = groupNotifications([
      item({ id: "a", type: "follow", postId: null }),
      item({ id: "b", postId: "post-1" }),
      item({ id: "c", postId: "post-1" }),
      item({ id: "d", type: "group_invite", postId: null, groupId: "g" }),
      item({ id: "e", postId: "post-2" }),
    ]);

    expect(rowIds(rows)).toEqual([["a"], ["b", "c"], ["d"], ["e"]]);
  });

  it("does not merge the same post across a gap", () => {
    const rows = groupNotifications([
      item({ id: "n-1", postId: "post-1" }),
      item({ id: "n-2", postId: "post-1" }),
      item({ id: "n-3", postId: "post-2" }),
      item({ id: "n-4", postId: "post-1" }),
      item({ id: "n-5", postId: "post-1" }),
    ]);

    expect(rowIds(rows)).toEqual([["n-1", "n-2"], ["n-3"], ["n-4", "n-5"]]);
  });

  it("keeps a run of one as a single row", () => {
    const rows = groupNotifications([item({ id: "n-1" })]);

    expect(rows).toEqual([{ kind: "single", item: item({ id: "n-1" }) }]);
  });

  it("keeps repeated likes from the same person merged", () => {
    const rows = groupNotifications([
      item({ id: "n-1", actor: actor("user-2", "Ana") }),
      item({ id: "n-2", actor: actor("user-2", "Ana") }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "group" });
  });

  it("returns an empty list for no notifications", () => {
    expect(groupNotifications([])).toEqual([]);
  });
});

/** Builds the one grouped row the given consecutive items must merge into. */
function oneGroup(items: NotificationItem[]): NotificationGroupRow {
  const rows = groupNotifications(items);
  const row = rows[0];
  if (rows.length !== 1 || !row || row.kind !== "group") {
    throw new Error("expected one grouped row");
  }
  return row;
}

describe("rowCreatedAt", () => {
  it("uses the item's time for a single row", () => {
    expect(
      rowCreatedAt({
        kind: "single",
        item: item({ createdAt: "2026-11-19T09:00:00.000Z" }),
      }),
    ).toBe("2026-11-19T09:00:00.000Z");
  });

  it("uses the newest notification's time for a group", () => {
    const row = oneGroup([
      item({ id: "n-1", createdAt: "2026-11-19T09:00:00.000Z" }),
      item({ id: "n-2", createdAt: "2026-11-18T09:00:00.000Z" }),
    ]);
    expect(rowCreatedAt(row)).toBe("2026-11-19T09:00:00.000Z");
  });
});

describe("groupLeadActor", () => {
  it("names the group after the most recent actor", () => {
    const row = oneGroup([
      item({ id: "n-1", actor: actor("user-4", "Cid") }),
      item({ id: "n-2", actor: actor("user-2", "Ana") }),
    ]);
    expect(groupLeadActor(row)).toMatchObject({ displayName: "Cid" });
  });
});

describe("describeGroupedNotification", () => {
  const group = oneGroup;

  it("counts distinct others for likes", () => {
    const row = group([
      item({ id: "n-1", actor: actor("user-2", "Ana") }),
      item({ id: "n-2", actor: actor("user-3", "Bo") }),
      item({ id: "n-3", actor: actor("user-4", "Cid") }),
      item({ id: "n-4", actor: actor("user-5", "Dee") }),
      item({ id: "n-5", actor: actor("user-6", "Eli") }),
    ]);

    expect(describeGroupedNotification(row)).toEqual({
      text: "and 4 others liked your post",
      to: "/post/post-1",
    });
  });

  it("uses the singular wording for one other person", () => {
    const row = group([
      item({ id: "n-1", actor: actor("user-2", "Ana") }),
      item({ id: "n-2", actor: actor("user-3", "Bo") }),
    ]);

    expect(describeGroupedNotification(row)).toEqual({
      text: "and 1 other liked your post",
      to: "/post/post-1",
    });
  });

  it("counts people, not notifications: a repeat adds nobody", () => {
    const row = group([
      item({ id: "n-1", actor: actor("user-2", "Ana") }),
      item({ id: "n-2", actor: actor("user-2", "Ana") }),
      item({ id: "n-3", actor: actor("user-3", "Bo") }),
      item({ id: "n-4", actor: actor("user-3", "Bo") }),
      item({ id: "n-5", actor: actor("user-4", "Cid") }),
    ]);

    expect(describeGroupedNotification(row)).toEqual({
      text: "and 2 others liked your post",
      to: "/post/post-1",
    });
  });

  it("names comments when only comments are merged", () => {
    const row = group([
      item({ id: "n-1", type: "comment", actor: actor("user-2", "Ana") }),
      item({ id: "n-2", type: "comment", actor: actor("user-3", "Bo") }),
      item({ id: "n-3", type: "comment", actor: actor("user-4", "Cid") }),
    ]);

    expect(describeGroupedNotification(row)).toEqual({
      text: "and 2 others commented on your post",
      to: "/post/post-1",
    });
  });

  it("names likes and comments when both are merged", () => {
    const row = group([
      item({ id: "n-1", type: "like", actor: actor("user-2", "Ana") }),
      item({ id: "n-2", type: "comment", actor: actor("user-3", "Bo") }),
      item({ id: "n-3", type: "like", actor: actor("user-4", "Cid") }),
    ]);

    expect(describeGroupedNotification(row)).toEqual({
      text: "and 2 others liked and commented on your post",
      to: "/post/post-1",
    });
  });

  it("reads as one plain sentence when everyone is the same person", () => {
    const row = group([
      item({ id: "n-1", type: "like", actor: actor("user-2", "Ana") }),
      item({ id: "n-2", type: "comment", actor: actor("user-2", "Ana") }),
    ]);

    expect(describeGroupedNotification(row)).toEqual({
      text: "liked your post",
      to: "/post/post-1",
    });
  });

  it("counts deleted accounts as one person each", () => {
    const row = group([
      item({ id: "n-1", actor: actor("user-2", "Ana") }),
      item({ id: "n-2", actor: null }),
      item({ id: "n-3", actor: null }),
    ]);

    expect(describeGroupedNotification(row)).toEqual({
      text: "and 2 others liked your post",
      to: "/post/post-1",
    });
  });

  it("has Japanese twins for the grouped sentences", async () => {
    await loadJapaneseDictionary();
    setLocale("ja");

    try {
      const likesMany = group([
        item({ id: "n-1", actor: actor("user-2", "Ana") }),
        item({ id: "n-2", actor: actor("user-3", "Bo") }),
        item({ id: "n-3", actor: actor("user-4", "Cid") }),
      ]);
      expect(describeGroupedNotification(likesMany)).toEqual({
        text: "と他2人があなたの投稿にいいねしました",
        to: "/post/post-1",
      });

      const commentsOne = group([
        item({ id: "n-1", type: "comment", actor: actor("user-2", "Ana") }),
        item({ id: "n-2", type: "comment", actor: actor("user-3", "Bo") }),
      ]);
      expect(describeGroupedNotification(commentsOne)).toEqual({
        text: "と他1人があなたの投稿にコメントしました",
        to: "/post/post-1",
      });

      const mixedMany = group([
        item({ id: "n-1", type: "like", actor: actor("user-2", "Ana") }),
        item({ id: "n-2", type: "comment", actor: actor("user-3", "Bo") }),
        item({ id: "n-3", type: "like", actor: actor("user-4", "Cid") }),
      ]);
      expect(describeGroupedNotification(mixedMany)).toEqual({
        text: "と他2人があなたの投稿にいいねとコメントしました",
        to: "/post/post-1",
      });
    } finally {
      setLocale("en");
    }
  });
});
