import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GUEST_AUTH } from "@/lib/auth/use-auth";
import { resetSocialInstallState } from "@/lib/social/availability";

import {
  useGroupBySlug,
  useGroupMemberCount,
  useGroupMembers,
  useMyGroupMembership,
  useMyGroups,
  usePublicGroups,
} from "@/lib/groups/queries";

import {
  createFakeClient,
  createQueryClient,
  createWrapper,
  groupMemberRow,
  groupRow,
  profileRow,
  SIGNED_IN_AUTH,
  type ChainRecord,
} from "@/lib/groups/test-client";

let queryClient: ReturnType<typeof createQueryClient>;

beforeEach(() => {
  resetSocialInstallState();
  queryClient = createQueryClient();
});

afterEach(() => {
  queryClient.clear();
  resetSocialInstallState();
});

/** Records for one table, in call order. */
function recordsOn(
  fake: ReturnType<typeof createFakeClient>,
  table: string,
): ChainRecord[] {
  return fake.records.filter((record) => record.table === table);
}

describe("usePublicGroups", () => {
  it("lists public groups ordered by name", async () => {
    const rows = [
      groupRow({ id: "g1", slug: "alpha", name: "Alpha" }),
      groupRow({ id: "g2", slug: "beta", name: "Beta" }),
    ];
    const fake = createFakeClient({ tables: { groups: { data: rows } } });
    const { result } = renderHook(() => usePublicGroups("", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((group) => group.slug)).toEqual([
      "alpha",
      "beta",
    ]);
    const record = recordsOn(fake, "groups")[0];
    expect(record?.eqFilters).toContainEqual(["visibility", "public"]);
    expect(record?.ilikeFilters).toEqual([]);
    expect(record?.orders).toContainEqual(["name", { ascending: true }]);
  });

  it("searches by name with ilike when a term is given", async () => {
    const fake = createFakeClient({ tables: { groups: { data: [] } } });
    const { result } = renderHook(
      () => usePublicGroups("  Rocket  ", fake.client),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const record = recordsOn(fake, "groups")[0];
    expect(record?.ilikeFilters).toContainEqual(["name", "%Rocket%"]);
  });

  it("does not run against a null client", async () => {
    const { result } = renderHook(() => usePublicGroups("", null), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fails soft while the tables are missing", async () => {
    const fake = createFakeClient({
      tables: {
        groups: { data: null, error: { code: "42P01", message: "missing" } },
      },
    });
    const { result } = renderHook(() => usePublicGroups("", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});

describe("useMyGroups", () => {
  it("joins the user's active memberships to their groups", async () => {
    const fake = createFakeClient({
      resolve: (record) => {
        if (record.table === "group_members") {
          return {
            data: [
              groupMemberRow({ groupId: "g1", userId: "user-1" }),
              groupMemberRow({ groupId: "g2", userId: "user-1" }),
            ],
          };
        }
        if (record.table === "groups") {
          return {
            data: [
              groupRow({ id: "g2", slug: "beta", name: "Beta" }),
              groupRow({ id: "g1", slug: "alpha", name: "Alpha" }),
            ],
          };
        }
        return { data: [], error: null };
      },
    });
    const { result } = renderHook(() => useMyGroups(fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((group) => group.slug)).toEqual([
      "beta",
      "alpha",
    ]);
    const memberRecord = recordsOn(fake, "group_members")[0];
    expect(memberRecord?.eqFilters).toContainEqual(["user_id", "user-1"]);
    expect(memberRecord?.eqFilters).toContainEqual(["status", "active"]);
    const groupRecord = recordsOn(fake, "groups")[0];
    expect(groupRecord?.inFilters).toContainEqual(["id", ["g1", "g2"]]);
  });

  it("returns nothing for guests", async () => {
    const fake = createFakeClient();
    const { result } = renderHook(() => useMyGroups(fake.client), {
      wrapper: createWrapper(queryClient, GUEST_AUTH),
    });

    expect(result.current.data).toBeUndefined();
    expect(fake.records.length).toBe(0);
  });

  it("returns nothing when the user has no active memberships", async () => {
    const fake = createFakeClient({ tables: { group_members: { data: [] } } });
    const { result } = renderHook(() => useMyGroups(fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
    expect(recordsOn(fake, "groups").length).toBe(0);
  });
});

describe("useGroupBySlug", () => {
  it("finds a group by slug", async () => {
    const row = groupRow({ id: "g1", slug: "elite-four" });
    const fake = createFakeClient({
      resolve: (record) =>
        record.table === "groups" ? { data: row } : { data: null },
    });
    const { result } = renderHook(
      () => useGroupBySlug("elite-four", fake.client),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.id).toBe("g1");
    expect(result.current.data?.visibility).toBe("public");
    const record = recordsOn(fake, "groups")[0];
    expect(record?.eqFilters).toContainEqual(["slug", "elite-four"]);
    expect(record?.isMaybeSingle).toBe(true);
  });

  it("returns null when no group has the slug", async () => {
    const fake = createFakeClient({ tables: { groups: { data: null } } });
    const { result } = renderHook(
      () => useGroupBySlug("missing", fake.client),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });
});

describe("useMyGroupMembership", () => {
  it("reads the signed-in user's own membership row", async () => {
    const row = groupMemberRow({
      groupId: "g1",
      userId: "user-1",
      role: "moderator",
    });
    const fake = createFakeClient({
      resolve: (record) =>
        record.table === "group_members" ? { data: row } : { data: null },
    });
    const { result } = renderHook(
      () => useMyGroupMembership("g1", fake.client),
      { wrapper: createWrapper(queryClient, SIGNED_IN_AUTH) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      role: "moderator",
      status: "active",
      createdAt: "2026-11-18T10:00:00.000Z",
    });
    const record = recordsOn(fake, "group_members")[0];
    expect(record?.eqFilters).toContainEqual(["group_id", "g1"]);
    expect(record?.eqFilters).toContainEqual(["user_id", "user-1"]);
  });

  it("returns null for guests", async () => {
    const fake = createFakeClient();
    const { result } = renderHook(
      () => useMyGroupMembership("g1", fake.client),
      { wrapper: createWrapper(queryClient, GUEST_AUTH) },
    );

    expect(result.current.data).toBeUndefined();
    expect(fake.records.length).toBe(0);
  });
});

describe("useGroupMembers", () => {
  it("resolves profiles and sorts owners first", async () => {
    const fake = createFakeClient({
      resolve: (record) => {
        if (record.table === "group_members") {
          return {
            data: [
              groupMemberRow({
                groupId: "g1",
                userId: "user-2",
                role: "member",
                created_at: "2026-11-18T11:00:00.000Z",
              }),
              groupMemberRow({
                groupId: "g1",
                userId: "user-1",
                role: "owner",
                created_at: "2026-11-18T10:00:00.000Z",
              }),
              groupMemberRow({
                groupId: "g1",
                userId: "user-3",
                role: "moderator",
                created_at: "2026-11-18T12:00:00.000Z",
              }),
            ],
          };
        }
        if (record.table === "profiles") {
          return {
            data: [
              profileRow({ id: "user-1", username: "owner" }),
              profileRow({ id: "user-2", username: "member" }),
              profileRow({ id: "user-3", username: "mod" }),
            ],
          };
        }
        return { data: [], error: null };
      },
    });
    const { result } = renderHook(() => useGroupMembers("g1", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const members = result.current.data ?? [];
    expect(members.map((member) => member.role)).toEqual([
      "owner",
      "moderator",
      "member",
    ]);
    expect(members[0]?.profile?.username).toBe("owner");
    expect(members[2]?.profile?.username).toBe("member");
    const profileRecord = recordsOn(fake, "profiles")[0];
    expect(profileRecord?.inFilters).toContainEqual([
      "id",
      ["user-2", "user-1", "user-3"],
    ]);
  });

  it("keeps members whose profile row is missing", async () => {
    const fake = createFakeClient({
      resolve: (record) => {
        if (record.table === "group_members") {
          return {
            data: [groupMemberRow({ groupId: "g1", userId: "user-9" })],
          };
        }
        return { data: [], error: null };
      },
    });
    const { result } = renderHook(() => useGroupMembers("g1", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.length).toBe(1);
    expect(result.current.data?.[0]?.profile).toBeNull();
  });
});

describe("useGroupMemberCount", () => {
  it("counts active members", async () => {
    const fake = createFakeClient({
      resolve: (record) =>
        record.table === "group_members"
          ? { data: null, error: null, count: 7 }
          : { data: null, error: null },
    });
    const { result } = renderHook(
      () => useGroupMemberCount("g1", fake.client),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(7);
    const record = recordsOn(fake, "group_members")[0];
    expect(record?.selectOptions).toMatchObject({ count: "exact", head: true });
    expect(record?.eqFilters).toContainEqual(["status", "active"]);
  });
});
