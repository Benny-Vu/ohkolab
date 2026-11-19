/**
 * Write hooks for groups: creating and updating groups, joining, leaving,
 * invites, roles, removing members and deleting groups, plus the
 * group-moderator post removal. Mutations validate first, never throw, and
 * return a SocialResult so screens can react to rate limits and permission
 * failures without parsing database errors. Every delete selects the rows it
 * removed, so a zero-row delete (the database refusing the change) is
 * reported as a failure instead of a silent success.
 */

import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
} from "@tanstack/react-query";

import { normalizeUsername } from "@/lib/auth/validation";
import { useAuth } from "@/lib/auth/use-auth";
import type { GroupRow } from "@/lib/database.types";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

import {
  describeWriteError,
  isSocialNotInstalled,
} from "@/lib/social/availability";
import {
  socialFail,
  socialSucceed,
  type SocialFailure,
  type SocialResult,
} from "@/lib/social/errors";
import {
  MODERATION_REASON_MAX,
  MODERATION_REASON_MIN,
} from "@/lib/social/validation";

import {
  GROUP_QUERY_KEYS,
  toGroupSummary,
  type GroupMember,
  type MyGroupMembership,
} from "@/lib/groups/queries";
import { track } from "@/lib/telemetry/analytics";
import {
  normalizeGroupDescription,
  normalizeGroupName,
  normalizeSlug,
  validateGroupDescription,
  validateGroupName,
  validateGroupVisibility,
  validateSlug,
  type GroupCategory,
  type GroupLanguage,
  type GroupRole,
  type GroupVisibility,
} from "@/lib/groups/validation";

export interface CreateGroupInput {
  name: string;
  slug: string;
  description?: string | null;
  visibility: GroupVisibility;
  /** Optional discovery tags; null leaves the group untagged. */
  category?: GroupCategory | null;
  language?: GroupLanguage | null;
}

export interface UpdateGroupInput {
  groupId: string;
  name: string;
  description?: string | null;
  visibility: GroupVisibility;
}

export interface GroupRefInput {
  groupId: string;
}

export interface InviteMemberInput {
  groupId: string;
  username: string;
}

export interface SetMemberRoleInput {
  groupId: string;
  userId: string;
  role: Exclude<GroupRole, "owner">;
}

export interface RemoveMemberInput {
  groupId: string;
  userId: string;
}

export interface RemoveGroupPostInput {
  postId: string;
  reason: string;
}

/** Creates a group. The owner's membership row is added by a database trigger. */
export function useCreateGroup(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<GroupRow>, SocialFailure, CreateGroupInput> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<GroupRow>, SocialFailure, CreateGroupInput>({
    mutationFn: async (input): Promise<SocialResult<GroupRow>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      const name = normalizeGroupName(input.name);
      const nameError = validateGroupName(name);
      if (nameError) return socialFail("invalid_input", nameError);
      const slug = normalizeSlug(input.slug);
      const slugError = validateSlug(slug);
      if (slugError) return socialFail("invalid_input", slugError);
      const description = normalizeGroupDescription(input.description);
      const descriptionError = validateGroupDescription(description);
      if (descriptionError)
        return socialFail("invalid_input", descriptionError);
      const visibilityError = validateGroupVisibility(input.visibility);
      if (visibilityError) {
        return socialFail("invalid_input", visibilityError);
      }
      const { data, error } = await client
        .from("groups")
        .insert({
          slug,
          name,
          description,
          visibility: input.visibility,
          owner_id: me,
          category: input.category ?? null,
          language: input.language ?? null,
        })
        .select("*")
        .single();
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed(data);
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      track("group_created", { visibility: result.data.visibility });
      // Seed the cache so the new group's page already shows the owner as a
      // member; the database trigger added the membership row server-side.
      const group = toGroupSummary(result.data);
      queryClient.setQueryData([...GROUP_QUERY_KEYS.bySlug, group.slug], group);
      const me = user?.id ?? null;
      if (me) {
        const membership: MyGroupMembership = {
          role: "owner",
          status: "active",
          createdAt: group.createdAt,
        };
        queryClient.setQueryData(
          [...GROUP_QUERY_KEYS.myMembership, group.id, me],
          membership,
        );
        const ownerMember: GroupMember = {
          userId: me,
          role: "owner",
          status: "active",
          joinedAt: group.createdAt,
          profile: null,
        };
        queryClient.setQueryData(
          [...GROUP_QUERY_KEYS.members, group.id],
          [ownerMember],
        );
        queryClient.setQueryData(
          [...GROUP_QUERY_KEYS.memberCount, group.id],
          1,
        );
      }
      invalidateGroupQueries(queryClient);
    },
  });
}

/** Updates a group's name, description and visibility. Owners only (RLS). */
export function useUpdateGroup(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<undefined>, SocialFailure, UpdateGroupInput> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, UpdateGroupInput>({
    mutationFn: async (input): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      const name = normalizeGroupName(input.name);
      const nameError = validateGroupName(name);
      if (nameError) return socialFail("invalid_input", nameError);
      const description = normalizeGroupDescription(input.description);
      const descriptionError = validateGroupDescription(description);
      if (descriptionError)
        return socialFail("invalid_input", descriptionError);
      const visibilityError = validateGroupVisibility(input.visibility);
      if (visibilityError) {
        return socialFail("invalid_input", visibilityError);
      }
      const { error } = await client
        .from("groups")
        .update({
          name,
          description,
          visibility: input.visibility,
        })
        .eq("id", input.groupId);
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      invalidateGroupQueries(queryClient);
    },
  });
}

/** Snapshots restored when an optimistic membership write is refused. */
export interface MembershipSnapshot {
  snapshots: Array<[QueryKey, unknown]>;
}

/** Restores the snapshots taken before an optimistic membership write. */
function rollbackMembership(
  queryClient: ReturnType<typeof useQueryClient>,
  context: MembershipSnapshot | undefined,
): void {
  if (!context) return;
  for (const [key, data] of context.snapshots) {
    queryClient.setQueryData(key, data);
  }
}

/**
 * Applies the signed-in user joining or leaving one group to the cached
 * membership, member count and member list, so the button flips at once.
 * `joining` false means leaving.
 */
function applyOptimisticMembership(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string,
  me: string,
  joining: boolean,
): void {
  const stamp = new Date().toISOString();
  for (const [key, data] of queryClient.getQueriesData({
    queryKey: ["groups"],
  })) {
    if (key[0] === "groups" && key[1] === "my-membership") {
      // The key is [prefix, groupId, me]; only our own row changes.
      if (key[2] !== groupId || key[3] !== me) continue;
      queryClient.setQueryData(
        key,
        joining
          ? ({
              role: "member",
              status: "active",
              createdAt: stamp,
            } as MyGroupMembership)
          : null,
      );
    } else if (key[0] === "groups" && key[1] === "member-count") {
      if (key[2] !== groupId || typeof data !== "number") continue;
      queryClient.setQueryData(key, Math.max(0, data + (joining ? 1 : -1)));
    } else if (key[0] === "groups" && key[1] === "members") {
      if (key[2] !== groupId || !Array.isArray(data)) continue;
      const members = data as GroupMember[];
      queryClient.setQueryData(
        key,
        joining
          ? [
              ...members.filter((member) => member.userId !== me),
              {
                userId: me,
                role: "member",
                status: "active",
                joinedAt: stamp,
                profile: null,
              } satisfies GroupMember,
            ]
          : members.filter((member) => member.userId !== me),
      );
    }
  }
}

/** Joins a public group as an active member. */
export function useJoinGroup(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  GroupRefInput,
  MembershipSnapshot
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    GroupRefInput,
    MembershipSnapshot
  >({
    mutationFn: async (input): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      if (input.groupId === "") {
        return socialFail("invalid_input", "Choose a group to join.");
      }
      const { error } = await client.from("group_members").insert({
        group_id: input.groupId,
        user_id: me,
        role: "member",
        status: "active",
      });
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed();
    },
    onMutate: (input) => {
      const me = user?.id ?? null;
      if (
        !me ||
        !input ||
        input.groupId === "" ||
        isSocialNotInstalled() ||
        !client
      ) {
        return { snapshots: [] };
      }
      const snapshots = queryClient.getQueriesData({ queryKey: ["groups"] });
      applyOptimisticMembership(queryClient, input.groupId, me, true);
      return { snapshots };
    },
    onSuccess: (result, _variables, context) => {
      if (!result.ok) rollbackMembership(queryClient, context);
    },
    onSettled: () => {
      invalidateGroupQueries(queryClient);
    },
  });
}

/** Leaves a group by deleting the signed-in user's own membership row. */
export function useLeaveGroup(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  GroupRefInput,
  MembershipSnapshot
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    GroupRefInput,
    MembershipSnapshot
  >({
    mutationFn: async (input): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      if (input.groupId === "") {
        return socialFail("invalid_input", "Choose a group to leave.");
      }
      const { data, error } = await client
        .from("group_members")
        .delete()
        .eq("group_id", input.groupId)
        .eq("user_id", me)
        .select();
      if (error) return { ok: false, error: describeWriteError(error) };
      if (!data || data.length === 0) {
        return socialFail("forbidden");
      }
      return socialSucceed();
    },
    onMutate: (input) => {
      const me = user?.id ?? null;
      if (
        !me ||
        !input ||
        input.groupId === "" ||
        isSocialNotInstalled() ||
        !client
      ) {
        return { snapshots: [] };
      }
      const snapshots = queryClient.getQueriesData({ queryKey: ["groups"] });
      applyOptimisticMembership(queryClient, input.groupId, me, false);
      return { snapshots };
    },
    onSuccess: (result, _variables, context) => {
      if (!result.ok) rollbackMembership(queryClient, context);
    },
    onSettled: () => {
      invalidateGroupQueries(queryClient);
    },
  });
}

/**
 * Invites a user by username. The username is resolved to an id via profiles
 * first; owners and moderators only (RLS).
 */
export function useInviteMember(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  InviteMemberInput
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, InviteMemberInput>(
    {
      mutationFn: async (input): Promise<SocialResult<undefined>> => {
        if (isSocialNotInstalled()) return socialFail("not_installed");
        if (!client) return socialFail("not_configured");
        const me = user?.id ?? null;
        if (!me) return socialFail("not_signed_in");
        const username = normalizeUsername(input.username);
        if (username.length === 0) {
          return socialFail("invalid_input", "Enter a username to invite.");
        }
        if (input.groupId === "") {
          return socialFail("invalid_input", "Choose a group first.");
        }
        const { data: profile, error: profileError } = await client
          .from("profiles")
          .select("id")
          .eq("username", username)
          .maybeSingle();
        if (profileError) {
          return { ok: false, error: describeWriteError(profileError) };
        }
        if (!profile) {
          return socialFail("not_found", "No user has that username.");
        }
        const { error } = await client.from("group_members").insert({
          group_id: input.groupId,
          user_id: profile.id,
          role: "member",
          status: "invited",
        });
        if (error) return { ok: false, error: describeWriteError(error) };
        return socialSucceed();
      },
      onSuccess: (result) => {
        if (!result.ok) return;
        invalidateGroupQueries(queryClient);
      },
    },
  );
}

/** Accepts an invitation: the invitee's own row becomes active. */
export function useAcceptInvite(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<undefined>, SocialFailure, GroupRefInput> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, GroupRefInput>({
    mutationFn: async (input): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      if (input.groupId === "") {
        return socialFail("invalid_input", "Choose a group first.");
      }
      const { error } = await client
        .from("group_members")
        .update({ status: "active" })
        .eq("group_id", input.groupId)
        .eq("user_id", me)
        .eq("status", "invited");
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      invalidateGroupQueries(queryClient);
    },
  });
}

/** Declines an invitation by deleting the invitee's own row. */
export function useDeclineInvite(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<undefined>, SocialFailure, GroupRefInput> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, GroupRefInput>({
    mutationFn: async (input): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      if (input.groupId === "") {
        return socialFail("invalid_input", "Choose a group first.");
      }
      const { data, error } = await client
        .from("group_members")
        .delete()
        .eq("group_id", input.groupId)
        .eq("user_id", me)
        .eq("status", "invited")
        .select();
      if (error) return { ok: false, error: describeWriteError(error) };
      if (!data || data.length === 0) {
        return socialFail("forbidden");
      }
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      invalidateGroupQueries(queryClient);
    },
  });
}

/** Sets a member's role to moderator or member. Owners only (RLS). */
export function useSetMemberRole(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  SetMemberRoleInput
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    SetMemberRoleInput
  >({
    mutationFn: async (input): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      if (input.groupId === "") {
        return socialFail("invalid_input", "Choose a group first.");
      }
      if (input.userId === "") {
        return socialFail("invalid_input", "Choose a member.");
      }
      if (input.role !== "moderator" && input.role !== "member") {
        return socialFail("invalid_input", "Choose a valid role.");
      }
      const { error } = await client
        .from("group_members")
        .update({ role: input.role })
        .eq("group_id", input.groupId)
        .eq("user_id", input.userId);
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      invalidateGroupQueries(queryClient);
    },
  });
}

/** Removes a member's row. Owners and moderators only (RLS). */
export function useRemoveMember(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  RemoveMemberInput
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, RemoveMemberInput>(
    {
      mutationFn: async (input): Promise<SocialResult<undefined>> => {
        if (isSocialNotInstalled()) return socialFail("not_installed");
        if (!client) return socialFail("not_configured");
        const me = user?.id ?? null;
        if (!me) return socialFail("not_signed_in");
        if (input.groupId === "") {
          return socialFail("invalid_input", "Choose a group first.");
        }
        if (input.userId === "") {
          return socialFail("invalid_input", "Choose a member.");
        }
        const { data, error } = await client
          .from("group_members")
          .delete()
          .eq("group_id", input.groupId)
          .eq("user_id", input.userId)
          .select();
        if (error) return { ok: false, error: describeWriteError(error) };
        if (!data || data.length === 0) {
          return socialFail("forbidden");
        }
        return socialSucceed();
      },
      onSuccess: (result) => {
        if (!result.ok) return;
        invalidateGroupQueries(queryClient);
      },
    },
  );
}

/**
 * Removes a post from a group. Group owners and moderators only; the RPC
 * records the reason and notifies the author.
 */
export function useRemoveGroupPost(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  RemoveGroupPostInput
> {
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    RemoveGroupPostInput
  >({
    mutationFn: async (input): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const reason = input.reason.trim();
      if (reason.length < MODERATION_REASON_MIN) {
        return socialFail("invalid_input", "Enter a reason for the removal.");
      }
      if (reason.length > MODERATION_REASON_MAX) {
        return socialFail(
          "invalid_input",
          `Reasons are limited to ${MODERATION_REASON_MAX} characters.`,
        );
      }
      const { error } = await client.rpc("remove_group_post", {
        target_post_id: input.postId,
        removal_reason: reason,
      });
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      invalidateGroupQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["social", "post"] });
    },
  });
}

export interface DeleteGroupInput {
  groupId: string;
  slug: string;
}

/** Deletes a group with its posts and members. Owners only (RLS). */
export function useDeleteGroup(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<undefined>, SocialFailure, DeleteGroupInput> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, DeleteGroupInput>({
    mutationFn: async (input): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      if (input.groupId === "") {
        return socialFail("invalid_input", "Choose a group first.");
      }
      const { data, error } = await client
        .from("groups")
        .delete()
        .eq("id", input.groupId)
        .select();
      if (error) return { ok: false, error: describeWriteError(error) };
      if (!data || data.length === 0) {
        return socialFail("forbidden");
      }
      return socialSucceed();
    },
    onSuccess: (result, input) => {
      if (!result.ok) return;
      queryClient.removeQueries({
        queryKey: [...GROUP_QUERY_KEYS.bySlug, input.slug],
      });
      invalidateGroupQueries(queryClient);
    },
  });
}

/** Invalidates every groups query after a mutation touches shared state. */
export function invalidateGroupQueries(queryClient: {
  invalidateQueries: (options: { queryKey: unknown[] }) => Promise<void> | void;
}): void {
  for (const key of Object.values(GROUP_QUERY_KEYS)) {
    void queryClient.invalidateQueries({ queryKey: [...key] });
  }
}
