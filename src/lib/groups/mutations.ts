/**
 * Write hooks for groups: creating and updating groups, joining, leaving,
 * invites, roles and removing members, plus the group-moderator post removal.
 * Mutations validate first, never throw, and return a SocialResult so screens
 * can react to rate limits and permission failures without parsing database
 * errors.
 */

import {
  useMutation,
  useQueryClient,
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

import { GROUP_QUERY_KEYS } from "@/lib/groups/queries";
import {
  normalizeGroupDescription,
  normalizeGroupName,
  normalizeSlug,
  validateGroupDescription,
  validateGroupName,
  validateGroupVisibility,
  validateSlug,
  type GroupRole,
  type GroupVisibility,
} from "@/lib/groups/validation";

export interface CreateGroupInput {
  name: string;
  slug: string;
  description?: string | null;
  visibility: GroupVisibility;
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
        })
        .select("*")
        .single();
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed(data);
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
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
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

/** Joins a public group as an active member. */
export function useJoinGroup(
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
    onSuccess: (result) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

/** Leaves a group by deleting the signed-in user's own membership row. */
export function useLeaveGroup(
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
        return socialFail("invalid_input", "Choose a group to leave.");
      }
      const { error } = await client
        .from("group_members")
        .delete()
        .eq("group_id", input.groupId)
        .eq("user_id", me);
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
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
        void queryClient.invalidateQueries({ queryKey: ["groups"] });
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
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
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
      const { error } = await client
        .from("group_members")
        .delete()
        .eq("group_id", input.groupId)
        .eq("user_id", me)
        .eq("status", "invited");
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
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
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
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
        const { error } = await client
          .from("group_members")
          .delete()
          .eq("group_id", input.groupId)
          .eq("user_id", input.userId);
        if (error) return { ok: false, error: describeWriteError(error) };
        return socialSucceed();
      },
      onSuccess: (result) => {
        if (!result.ok) return;
        void queryClient.invalidateQueries({ queryKey: ["groups"] });
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
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      void queryClient.invalidateQueries({
        queryKey: ["social", "group-feed"],
      });
      void queryClient.invalidateQueries({ queryKey: ["social", "post"] });
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
