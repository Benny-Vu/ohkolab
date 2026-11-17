import { describe, expect, it } from "vitest";

import {
  actorLabel,
  actorProfilePath,
  describeNotification,
} from "@/lib/notifications/sentences";
import type { NotificationItem } from "@/lib/notifications/types";

const ACTOR = {
  id: "user-2",
  username: "brock",
  displayName: "Brock",
  avatarSpecies: "Onix",
};

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
    actor: ACTOR,
    group: null,
    moderationAction: null,
    ...overrides,
  };
}

describe("actorLabel", () => {
  it("prefers the display name", () => {
    expect(actorLabel(ACTOR)).toBe("Brock");
  });

  it("falls back to the username without a display name", () => {
    expect(actorLabel({ ...ACTOR, displayName: null })).toBe("brock");
  });

  it("says Someone for deleted accounts", () => {
    expect(actorLabel(null)).toBe("Someone");
  });
});

describe("actorProfilePath", () => {
  it("links to the actor's profile", () => {
    expect(actorProfilePath(ACTOR)).toBe("/u/brock");
  });

  it("has no path for deleted accounts", () => {
    expect(actorProfilePath(null)).toBeNull();
  });
});

describe("describeNotification", () => {
  it("likes link to the post", () => {
    expect(describeNotification(item({ type: "like" }))).toEqual({
      text: "liked your post",
      to: "/post/post-1",
    });
  });

  it("comments link to the post", () => {
    expect(describeNotification(item({ type: "comment" }))).toEqual({
      text: "commented on your post",
      to: "/post/post-1",
    });
  });

  it("follows link to the actor's profile", () => {
    expect(
      describeNotification(item({ type: "follow", postId: null })),
    ).toEqual({ text: "followed you", to: "/u/brock" });
  });

  it("follows from a deleted account have no link", () => {
    expect(
      describeNotification(item({ type: "follow", postId: null, actor: null })),
    ).toEqual({ text: "followed you", to: null });
  });

  it("post removals show the reason and link to the action", () => {
    expect(
      describeNotification(
        item({
          type: "moderation",
          postId: null,
          moderationActionId: "action-1",
          moderationAction: {
            id: "action-1",
            action: "remove",
            targetType: "post",
            reason: "Spam",
          },
        }),
      ),
    ).toEqual({ text: "removed your post: Spam", to: "/moderation/action-1" });
  });

  it("comment removals show the reason", () => {
    expect(
      describeNotification(
        item({
          type: "moderation",
          postId: null,
          moderationActionId: "action-1",
          moderationAction: {
            id: "action-1",
            action: "remove",
            targetType: "comment",
            reason: "Spam",
          },
        }),
      ),
    ).toEqual({
      text: "removed your comment: Spam",
      to: "/moderation/action-1",
    });
  });

  it("suspensions show the reason", () => {
    expect(
      describeNotification(
        item({
          type: "moderation",
          postId: null,
          moderationActionId: "action-1",
          moderationAction: {
            id: "action-1",
            action: "suspend",
            targetType: "profile",
            reason: "Repeated spam",
          },
        }),
      ),
    ).toEqual({
      text: "suspended your account: Repeated spam",
      to: "/moderation/action-1",
    });
  });

  it("falls back when the moderation action row is gone", () => {
    expect(
      describeNotification(
        item({
          type: "moderation",
          postId: null,
          moderationActionId: "action-1",
        }),
      ),
    ).toEqual({ text: "took a moderation action", to: "/moderation/action-1" });
  });

  it("appeals link to the moderation action", () => {
    expect(
      describeNotification(
        item({ type: "appeal", postId: null, moderationActionId: "action-1" }),
      ),
    ).toEqual({ text: "reviewed your appeal", to: "/moderation/action-1" });
  });

  it("group invites name the group and link to it", () => {
    expect(
      describeNotification(
        item({
          type: "group_invite",
          postId: null,
          groupId: "group-1",
          group: { id: "group-1", slug: "test-group", name: "Test Group" },
        }),
      ),
    ).toEqual({
      text: "invited you to Test Group",
      to: "/g/test-group",
    });
  });

  it("group invites fall back when the group is gone", () => {
    expect(
      describeNotification(
        item({ type: "group_invite", postId: null, groupId: "group-1" }),
      ),
    ).toEqual({ text: "invited you to a group", to: null });
  });

  it("unknown types get a generic sentence", () => {
    expect(describeNotification(item({ type: "mystery" }))).toEqual({
      text: "sent you a notification",
      to: null,
    });
  });

  it("likes without a post have no link", () => {
    expect(describeNotification(item({ postId: null }))).toEqual({
      text: "liked your post",
      to: null,
    });
  });
});
