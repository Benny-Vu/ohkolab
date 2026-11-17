import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GUEST_AUTH } from "@/lib/auth/use-auth";
import { resetSocialInstallState } from "@/lib/social/availability";

import {
  useAcceptInvite,
  useCreateGroup,
  useDeclineInvite,
  useInviteMember,
  useJoinGroup,
  useLeaveGroup,
  useRemoveGroupPost,
  useRemoveMember,
  useSetMemberRole,
  useUpdateGroup,
  type SetMemberRoleInput,
} from "@/lib/groups/mutations";

import {
  createFakeClient,
  createQueryClient,
  expectFailed,
  runMutation,
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

describe("useCreateGroup", () => {
  it("inserts a group for the signed-in user", async () => {
    const fake = createFakeClient({
      tables: {
        groups: { data: { id: "g1", slug: "elite-four" }, error: null },
      },
    });
    const result = await runMutation(
      useCreateGroup,
      {
        name: "  Elite Four  ",
        slug: "Elite-Four",
        description: "  For fans.  ",
        visibility: "public",
      },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );

    expect(result?.ok).toBe(true);
    const record = recordsOn(fake, "groups")[0];
    expect(record?.insertValues).toEqual([
      {
        slug: "elite-four",
        name: "Elite Four",
        description: "For fans.",
        visibility: "public",
        owner_id: "user-1",
      },
    ]);
    expect(record?.isSingle).toBe(true);
  });

  it("rejects an invalid slug before touching the database", async () => {
    const fake = createFakeClient();
    const result = await runMutation(
      useCreateGroup,
      {
        name: "Elite Four",
        slug: "EF!",
        description: null,
        visibility: "public",
      },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );
    expectFailed(result, "invalid_input");
    expect(fake.records.length).toBe(0);
  });

  it("rejects an empty name", async () => {
    const fake = createFakeClient();
    const result = await runMutation(
      useCreateGroup,
      {
        name: "   ",
        slug: "elite-four",
        description: null,
        visibility: "public",
      },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );
    expectFailed(result, "invalid_input", "Choose a name for your group.");
  });

  it("rejects a too-long description", async () => {
    const fake = createFakeClient();
    const result = await runMutation(
      useCreateGroup,
      {
        name: "Elite Four",
        slug: "elite-four",
        description: "a".repeat(501),
        visibility: "public",
      },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );
    expectFailed(result, "invalid_input");
  });

  it("maps the daily rate limit to rate_limited", async () => {
    const fake = createFakeClient({
      tables: {
        groups: {
          data: null,
          error: { code: "P0A05", message: "too many groups" },
        },
      },
    });
    const result = await runMutation(
      useCreateGroup,
      {
        name: "Elite Four",
        slug: "elite-four",
        description: null,
        visibility: "public",
      },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );
    expectFailed(result, "rate_limited");
    expect(fake.records.length).toBe(1);
  });

  it("requires a signed-in user", async () => {
    const fake = createFakeClient();
    const result = await runMutation(
      useCreateGroup,
      {
        name: "Elite Four",
        slug: "elite-four",
        description: null,
        visibility: "public",
      },
      { client: fake.client, auth: GUEST_AUTH, queryClient },
    );
    expectFailed(result, "not_signed_in");
  });
});

describe("useUpdateGroup", () => {
  it("updates name, description and visibility", async () => {
    const fake = createFakeClient({ tables: { groups: { data: null } } });
    const result = await runMutation(
      useUpdateGroup,
      {
        groupId: "g1",
        name: "New Name",
        description: "New description",
        visibility: "invite_only",
      },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );

    expect(result?.ok).toBe(true);
    const record = recordsOn(fake, "groups")[0];
    expect(record?.updateValues).toEqual({
      name: "New Name",
      description: "New description",
      visibility: "invite_only",
    });
    expect(record?.eqFilters).toContainEqual(["id", "g1"]);
  });

  it("rejects an invalid visibility", async () => {
    const fake = createFakeClient();
    const result = await runMutation(
      useUpdateGroup,
      {
        groupId: "g1",
        name: "New Name",
        description: null,
        visibility: "private" as never,
      },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );
    expectFailed(result, "invalid_input");
    expect(fake.records.length).toBe(0);
  });
});

describe("useJoinGroup", () => {
  it("inserts an active member row for the signed-in user", async () => {
    const fake = createFakeClient({
      tables: { group_members: { data: null } },
    });
    const result = await runMutation(
      useJoinGroup,
      { groupId: "g1" },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );

    expect(result?.ok).toBe(true);
    const record = recordsOn(fake, "group_members")[0];
    expect(record?.insertValues).toEqual([
      {
        group_id: "g1",
        user_id: "user-1",
        role: "member",
        status: "active",
      },
    ]);
  });

  it("requires a group id", async () => {
    const fake = createFakeClient();
    const result = await runMutation(
      useJoinGroup,
      { groupId: "" },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );
    expectFailed(result, "invalid_input");
  });
});

describe("useLeaveGroup", () => {
  it("deletes the signed-in user's own row", async () => {
    const fake = createFakeClient({
      tables: { group_members: { data: null } },
    });
    const result = await runMutation(
      useLeaveGroup,
      { groupId: "g1" },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );

    expect(result?.ok).toBe(true);
    const record = recordsOn(fake, "group_members")[0];
    expect(record?.isDelete).toBe(true);
    expect(record?.eqFilters).toContainEqual(["group_id", "g1"]);
    expect(record?.eqFilters).toContainEqual(["user_id", "user-1"]);
  });
});

describe("useInviteMember", () => {
  it("resolves the username and inserts an invited row", async () => {
    const fake = createFakeClient({
      resolve: (record) => {
        if (record.table === "profiles") {
          return { data: { id: "user-2" }, error: null };
        }
        return { data: null, error: null };
      },
    });
    const result = await runMutation(
      useInviteMember,
      { groupId: "g1", username: "  Misty  " },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );

    expect(result?.ok).toBe(true);
    const profileRecord = recordsOn(fake, "profiles")[0];
    expect(profileRecord?.eqFilters).toContainEqual(["username", "misty"]);
    expect(profileRecord?.isMaybeSingle).toBe(true);
    const memberRecord = recordsOn(fake, "group_members")[0];
    expect(memberRecord?.insertValues).toEqual([
      {
        group_id: "g1",
        user_id: "user-2",
        role: "member",
        status: "invited",
      },
    ]);
  });

  it("fails with not_found when no user has the username", async () => {
    const fake = createFakeClient({
      resolve: (record) =>
        record.table === "profiles"
          ? { data: null, error: null }
          : { data: null },
    });
    const result = await runMutation(
      useInviteMember,
      { groupId: "g1", username: "ghost" },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );
    expectFailed(result, "not_found", "No user has that username.");
    expect(recordsOn(fake, "group_members").length).toBe(0);
  });

  it("rejects an empty username", async () => {
    const fake = createFakeClient();
    const result = await runMutation(
      useInviteMember,
      { groupId: "g1", username: "   " },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );
    expectFailed(result, "invalid_input");
  });
});

describe("useAcceptInvite", () => {
  it("flips the invited row to active", async () => {
    const fake = createFakeClient({
      tables: { group_members: { data: null } },
    });
    const result = await runMutation(
      useAcceptInvite,
      { groupId: "g1" },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );

    expect(result?.ok).toBe(true);
    const record = recordsOn(fake, "group_members")[0];
    expect(record?.updateValues).toEqual({ status: "active" });
    expect(record?.eqFilters).toContainEqual(["user_id", "user-1"]);
    expect(record?.eqFilters).toContainEqual(["status", "invited"]);
  });
});

describe("useDeclineInvite", () => {
  it("deletes the invited row", async () => {
    const fake = createFakeClient({
      tables: { group_members: { data: null } },
    });
    const result = await runMutation(
      useDeclineInvite,
      { groupId: "g1" },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );

    expect(result?.ok).toBe(true);
    const record = recordsOn(fake, "group_members")[0];
    expect(record?.isDelete).toBe(true);
    expect(record?.eqFilters).toContainEqual(["status", "invited"]);
  });
});

describe("useSetMemberRole", () => {
  it("updates the member's role", async () => {
    const fake = createFakeClient({
      tables: { group_members: { data: null } },
    });
    const result = await runMutation(
      useSetMemberRole,
      { groupId: "g1", userId: "user-2", role: "moderator" },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );

    expect(result?.ok).toBe(true);
    const record = recordsOn(fake, "group_members")[0];
    expect(record?.updateValues).toEqual({ role: "moderator" });
    expect(record?.eqFilters).toContainEqual(["user_id", "user-2"]);
  });

  it("rejects the owner role", async () => {
    const fake = createFakeClient();
    const result = await runMutation(
      useSetMemberRole,
      {
        groupId: "g1",
        userId: "user-2",
        role: "owner",
      } as unknown as SetMemberRoleInput,
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );
    expectFailed(result, "invalid_input");
  });
});

describe("useRemoveMember", () => {
  it("deletes the member's row", async () => {
    const fake = createFakeClient({
      tables: { group_members: { data: null } },
    });
    const result = await runMutation(
      useRemoveMember,
      { groupId: "g1", userId: "user-2" },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );

    expect(result?.ok).toBe(true);
    const record = recordsOn(fake, "group_members")[0];
    expect(record?.isDelete).toBe(true);
    expect(record?.eqFilters).toContainEqual(["group_id", "g1"]);
    expect(record?.eqFilters).toContainEqual(["user_id", "user-2"]);
  });
});

describe("useRemoveGroupPost", () => {
  it("calls the remove_group_post rpc with the reason", async () => {
    const fake = createFakeClient({
      rpc: { remove_group_post: { data: null, error: null } },
    });
    const result = await runMutation(
      useRemoveGroupPost,
      { postId: "post-1", reason: "  Spam in the group.  " },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );

    expect(result?.ok).toBe(true);
    expect(fake.rpcCalls).toEqual([
      {
        fn: "remove_group_post",
        args: {
          target_post_id: "post-1",
          removal_reason: "Spam in the group.",
        },
      },
    ]);
  });

  it("rejects an empty reason", async () => {
    const fake = createFakeClient();
    const result = await runMutation(
      useRemoveGroupPost,
      { postId: "post-1", reason: "   " },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );
    expectFailed(result, "invalid_input");
    expect(fake.rpcCalls.length).toBe(0);
  });

  it("maps a permission error to forbidden", async () => {
    const fake = createFakeClient({
      rpc: {
        remove_group_post: {
          data: null,
          error: { code: "42501", message: "not a moderator" },
        },
      },
    });
    const result = await runMutation(
      useRemoveGroupPost,
      { postId: "post-1", reason: "Spam." },
      { client: fake.client, auth: SIGNED_IN_AUTH, queryClient },
    );
    expectFailed(result, "forbidden");
  });
});
