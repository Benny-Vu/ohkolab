import { describe, expect, it } from "vitest";

import {
  groupNotifications,
  type NotificationRow,
} from "@/lib/notifications/grouping";
import {
  notificationSection,
  sectionNotifications,
} from "@/lib/notifications/sections";
import type { NotificationItem } from "@/lib/notifications/types";

const MINUTE = 60_000;
const DAY = 24 * 60 * 60 * 1000;

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
    actor: {
      id: "user-2",
      username: "brock",
      displayName: "Brock",
      avatarSpecies: null,
    },
    group: null,
    moderationAction: null,
    ...overrides,
  };
}

// A local midday "now", so minute offsets never cross a day boundary in
// any timezone the tests may run in.
const NOW = new Date(2026, 10, 19, 12, 0, 0);

function at(offsetMs: number): string {
  return new Date(NOW.getTime() - offsetMs).toISOString();
}

describe("notificationSection", () => {
  it("puts the current moment in Today", () => {
    expect(notificationSection(NOW.toISOString(), NOW)).toBe("today");
  });

  it("puts a moment from the future in Today", () => {
    expect(notificationSection(at(-60 * MINUTE), NOW)).toBe("today");
  });

  it("puts earlier today in Today", () => {
    expect(notificationSection(at(MINUTE), NOW)).toBe("today");
  });

  it("puts three days ago in This week", () => {
    expect(notificationSection(at(3 * DAY), NOW)).toBe("thisWeek");
  });

  it("puts exactly seven days ago in This week", () => {
    expect(notificationSection(at(7 * DAY), NOW)).toBe("thisWeek");
  });

  it("puts just over seven days ago in Earlier", () => {
    expect(notificationSection(at(7 * DAY + 1000), NOW)).toBe("earlier");
  });

  it("puts a month ago in Earlier", () => {
    expect(notificationSection(at(30 * DAY), NOW)).toBe("earlier");
  });

  it("falls back to Earlier for an unreadable timestamp", () => {
    expect(notificationSection("not a date", NOW)).toBe("earlier");
  });
});

describe("sectionNotifications", () => {
  function rowsOf(items: NotificationItem[]): NotificationRow[] {
    return groupNotifications(items);
  }

  it("orders the sections Today, This week, Earlier and skips empties", () => {
    // Different posts: the list groups consecutive same-post likes, and
    // these rows must stay three separate rows.
    const sections = sectionNotifications(
      rowsOf([
        item({ id: "n-old", postId: "post-1", createdAt: at(30 * DAY) }),
        item({ id: "n-week", postId: "post-2", createdAt: at(3 * DAY) }),
        item({ id: "n-today", postId: "post-3", createdAt: at(MINUTE) }),
      ]),
      NOW,
    );

    expect(sections.map((section) => section.name)).toEqual([
      "today",
      "thisWeek",
      "earlier",
    ]);
    expect(
      sections.map((section) =>
        section.rows.map((row) => (row.kind === "single" ? row.item.id : "")),
      ),
    ).toEqual([["n-today"], ["n-week"], ["n-old"]]);
  });

  it("only shows the sections that have rows", () => {
    const sections = sectionNotifications(
      rowsOf([item({ id: "n-week", createdAt: at(3 * DAY) })]),
      NOW,
    );

    expect(sections.map((section) => section.name)).toEqual(["thisWeek"]);
  });

  it("returns nothing for an empty list", () => {
    expect(sectionNotifications([], NOW)).toEqual([]);
  });

  it("places a group by its newest notification", () => {
    // One post liked again a minute after an older like: the merged row
    // belongs to Today, the section of its newest notification. The list
    // is newest first, like the page feeds it.
    const rows = rowsOf([
      item({ id: "n-1", createdAt: at(MINUTE) }),
      item({ id: "n-2", createdAt: at(3 * DAY) }),
    ]);
    const row = rows[0];
    expect(rows).toHaveLength(1);
    expect(row?.kind).toBe("group");

    const sections = sectionNotifications(rows, NOW);
    expect(sections.map((section) => section.name)).toEqual(["today"]);
  });
});
