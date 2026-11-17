import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { GUEST_AUTH } from "@/lib/auth/use-auth";
import { resetSocialInstallState } from "@/lib/social/availability";
import {
  createFakeClient,
  createQueryClient,
  createWrapper,
  groupRow,
  moderationActionRow,
  notificationRow,
  SIGNED_IN_AUTH,
  type ChainRecord,
  type FakeResult,
} from "@/lib/social/test-client";
import {
  NOTIFICATIONS_PAGE_SIZE,
  useNotifications,
  useUnreadNotificationCount,
} from "@/lib/notifications/queries";

const PROFILE = {
  id: "user-2",
  username: "brock",
  display_name: "Brock",
  avatar_species: "Onix",
};

function resolveWith(
  notifications: FakeResult,
  related: Record<string, FakeResult> = {},
) {
  return (record: ChainRecord): FakeResult => {
    if (record.table === "notifications") {
      return notifications;
    }
    return related[record.table] ?? { data: [], error: null };
  };
}

describe("useNotifications", () => {
  beforeEach(() => {
    resetSocialInstallState();
  });

  it("fetches a page scoped to the recipient, newest first", async () => {
    const rows = [notificationRow({ id: "n-1" })];
    const fake = createFakeClient({
      resolve: resolveWith(
        { data: rows, error: null },
        { profiles: { data: [PROFILE], error: null } },
      ),
    });
    const { result } = renderHook(() => useNotifications(fake.client), {
      wrapper: createWrapper(createQueryClient(), SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const record = fake.records.find((r) => r.table === "notifications");
    expect(record?.eqFilters).toEqual([["recipient_id", "user-1"]]);
    expect(record?.orders).toEqual([
      ["created_at", { ascending: false }],
      ["id", { ascending: false }],
    ]);
    expect(record?.limitCount).toBe(NOTIFICATIONS_PAGE_SIZE);

    const items = result.current.data?.pages[0] ?? [];
    expect(items).toHaveLength(1);
    expect(items[0]?.actor?.username).toBe("brock");
    expect(items[0]?.actor?.avatarSpecies).toBe("Onix");
  });

  it("resolves groups and moderation actions for the page", async () => {
    const rows = [
      notificationRow({
        id: "n-1",
        type: "group_invite",
        post_id: null,
        group_id: "group-1",
      }),
      notificationRow({
        id: "n-2",
        type: "moderation",
        post_id: null,
        moderation_action_id: "action-1",
      }),
    ];
    const fake = createFakeClient({
      resolve: resolveWith(
        { data: rows, error: null },
        {
          profiles: { data: [PROFILE], error: null },
          groups: { data: [groupRow({ id: "group-1" })], error: null },
          moderation_actions: {
            data: [moderationActionRow({ id: "action-1" })],
            error: null,
          },
        },
      ),
    });
    const { result } = renderHook(() => useNotifications(fake.client), {
      wrapper: createWrapper(createQueryClient(), SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const groupsRecord = fake.records.find((r) => r.table === "groups");
    expect(groupsRecord?.selectColumns).toBe("id, slug, name");
    expect(groupsRecord?.inFilters).toEqual([["id", ["group-1"]]]);
    const actionsRecord = fake.records.find(
      (r) => r.table === "moderation_actions",
    );
    expect(actionsRecord?.selectColumns).toBe(
      "id, action, target_type, reason",
    );
    expect(actionsRecord?.inFilters).toEqual([["id", ["action-1"]]]);

    const items = result.current.data?.pages[0] ?? [];
    expect(items[0]?.group?.name).toBe("Test Group");
    expect(items[1]?.moderationAction?.reason).toBe("Spam");
  });

  it("skips related queries when the page has nothing to resolve", async () => {
    const rows = [
      notificationRow({ id: "n-1", actor_id: null, post_id: null }),
    ];
    const fake = createFakeClient({
      resolve: resolveWith({ data: rows, error: null }),
    });
    const { result } = renderHook(() => useNotifications(fake.client), {
      wrapper: createWrapper(createQueryClient(), SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(
      fake.records.filter((r) => r.table !== "notifications"),
    ).toHaveLength(0);
  });

  it("keyset-paginates with the cursor of the last row", async () => {
    const pageOne = Array.from({ length: NOTIFICATIONS_PAGE_SIZE }, (_, i) =>
      notificationRow({ id: `n-${i}` }),
    );
    const fake = createFakeClient({
      resolve: (record) => {
        if (record.table === "notifications") {
          return record.orFilters.length === 0
            ? { data: pageOne, error: null }
            : { data: [notificationRow({ id: "n-20" })], error: null };
        }
        return { data: [], error: null };
      },
    });
    const { result } = renderHook(() => useNotifications(fake.client), {
      wrapper: createWrapper(createQueryClient(), SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(false);

    const pageRecords = fake.records.filter((r) => r.table === "notifications");
    expect(pageRecords[1]?.orFilters[0]).toContain(
      "created_at.lt.2026-11-18T10:00:00.000Z",
    );
    expect(pageRecords[1]?.orFilters[0]).toContain("id.lt.n-19");
  });

  it("fails soft with an empty list while the tables are missing", async () => {
    const fake = createFakeClient({
      tables: { notifications: { data: null, error: { code: "42P01" } } },
    });
    const { result } = renderHook(() => useNotifications(fake.client), {
      wrapper: createWrapper(createQueryClient(), SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages).toEqual([[]]);
    expect(result.current.isError).toBe(false);
  });

  it("surfaces other errors as a SocialFailure", async () => {
    const fake = createFakeClient({
      tables: {
        notifications: {
          data: null,
          error: { code: "XX000", message: "boom" },
        },
      },
    });
    const { result } = renderHook(() => useNotifications(fake.client), {
      wrapper: createWrapper(createQueryClient(), SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe("unknown");
  });

  it("does not fetch while signed out", async () => {
    const fake = createFakeClient();
    const { result } = renderHook(() => useNotifications(fake.client), {
      wrapper: createWrapper(createQueryClient(), GUEST_AUTH),
    });

    await act(async () => {});
    expect(result.current.isPending).toBe(true);
    expect(fake.records).toHaveLength(0);
  });
});

describe("useUnreadNotificationCount", () => {
  beforeEach(() => {
    resetSocialInstallState();
  });

  it("counts unread notifications with a head request", async () => {
    const fake = createFakeClient({
      tables: { notifications: { data: null, error: null, count: 3 } },
    });
    const { result } = renderHook(
      () => useUnreadNotificationCount(fake.client),
      {
        wrapper: createWrapper(createQueryClient(), SIGNED_IN_AUTH),
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(3);

    const record = fake.records.at(0);
    expect(record?.selectOptions).toEqual({ count: "exact", head: true });
    expect(record?.eqFilters).toEqual([["recipient_id", "user-1"]]);
    expect(record?.isFilters).toEqual([["read_at", null]]);
  });

  it("treats a missing count as zero", async () => {
    const fake = createFakeClient({
      tables: { notifications: { data: null, error: null, count: null } },
    });
    const { result } = renderHook(
      () => useUnreadNotificationCount(fake.client),
      {
        wrapper: createWrapper(createQueryClient(), SIGNED_IN_AUTH),
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it("fails soft at zero while the tables are missing", async () => {
    const fake = createFakeClient({
      tables: { notifications: { data: null, error: { code: "42P01" } } },
    });
    const { result } = renderHook(
      () => useUnreadNotificationCount(fake.client),
      {
        wrapper: createWrapper(createQueryClient(), SIGNED_IN_AUTH),
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
    expect(result.current.isError).toBe(false);
  });

  it("does not fetch while signed out", async () => {
    const fake = createFakeClient();
    const { result } = renderHook(
      () => useUnreadNotificationCount(fake.client),
      {
        wrapper: createWrapper(createQueryClient(), GUEST_AUTH),
      },
    );

    await act(async () => {});
    expect(result.current.isPending).toBe(true);
    expect(fake.records).toHaveLength(0);
  });
});
