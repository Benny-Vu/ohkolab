/**
 * Read hooks for groups: discovery, membership and member lists. Reads fail
 * soft (empty data, no error state) while the social tables are missing, and
 * surface mapped SocialFailure errors for anything else.
 */

import {
  useQuery,
  type QueryKey,
  type UseQueryResult,
} from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import type { GroupMemberRow, GroupRow } from "@/lib/database.types";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

import { isSocialNotInstalled, softReadError } from "@/lib/social/availability";
import type { SocialFailure } from "@/lib/social/errors";
import type { SocialProfileSummary } from "@/lib/social/queries";

/** A public group with its active member count, for the Discover list. */
export type DiscoverGroup = GroupSummary & { memberCount: number };

import {
  asGroupCategory,
  asGroupLanguage,
  asGroupMemberStatus,
  asGroupRole,
  asGroupVisibility,
  type GroupCategory,
  type GroupLanguage,
} from "@/lib/groups/validation";

/**
 * The one query-key factory for groups. Read hooks build their exact keys
 * from these prefixes and mutations invalidate the prefixes, so the keys
 * cannot drift between files.
 */
export const GROUP_QUERY_KEYS = {
  public: ["groups", "public"] as const,
  discover: ["groups", "discover"] as const,
  mine: ["groups", "mine"] as const,
  user: ["groups", "user"] as const,
  bySlug: ["groups", "by-slug"] as const,
  myMembership: ["groups", "my-membership"] as const,
  members: ["groups", "members"] as const,
  memberCount: ["groups", "member-count"] as const,
  groupFeed: ["social", "group-feed"] as const,
};

/** How many groups the Discover tab loads per search. */
export const GROUPS_PAGE_SIZE = 50;

/**
 * Group lists change slowly and every membership mutation invalidates
 * the prefixes anyway, so ten minutes of staleTime costs nothing.
 */
export const GROUPS_STALE_TIME = 10 * 60 * 1000;

/** A group as the screens show it, with the viewer's own membership resolved. */
export interface GroupSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: "public" | "invite_only";
  category: GroupCategory | null;
  language: GroupLanguage | null;
  ownerId: string;
  createdAt: string;
}

/** The signed-in user's own membership in one group. */
export interface MyGroupMembership {
  role: "owner" | "moderator" | "member";
  status: "active" | "invited" | "requested";
  createdAt: string;
}

/** One member of a group, with their profile resolved for display. */
export interface GroupMember {
  userId: string;
  role: "owner" | "moderator" | "member";
  status: "active" | "invited" | "requested";
  joinedAt: string;
  profile: SocialProfileSummary | null;
}

export function toGroupSummary(row: GroupRow): GroupSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    visibility: asGroupVisibility(row.visibility),
    category: asGroupCategory(row.category),
    language: asGroupLanguage(row.language),
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

function toMyMembership(row: GroupMemberRow): MyGroupMembership {
  return {
    role: asGroupRole(row.role),
    status: asGroupMemberStatus(row.status),
    createdAt: row.created_at,
  };
}

/**
 * Public groups for the Discover tab, optionally filtered by a name search
 * (case-insensitive contains). Ordered by name.
 */
export function usePublicGroups(
  search: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<GroupSummary[], SocialFailure> {
  const trimmed = search.trim();
  return useQuery<GroupSummary[], SocialFailure>({
    queryKey: [...GROUP_QUERY_KEYS.public, trimmed.toLowerCase()],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      let query = client.from("groups").select("*").eq("visibility", "public");
      if (trimmed.length > 0) {
        query = query.ilike("name", `%${trimmed}%`);
      }
      const { data, error } = await query
        .order("name", { ascending: true })
        .limit(GROUPS_PAGE_SIZE);
      if (error) {
        return softReadError(error, []);
      }
      return (data ?? []).map(toGroupSummary);
    },
    staleTime: GROUPS_STALE_TIME,
    enabled: client !== null,
    retry: false,
  });
}

/** Loads the Discover directory: public groups with their member counts. */
export async function fetchDiscoverGroups(
  client: AppSupabaseClient,
): Promise<DiscoverGroup[]> {
  const { data: groupRows, error: groupError } = await client
    .from("groups")
    .select("*")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(GROUPS_PAGE_SIZE);
  if (groupError) {
    return softReadError(groupError, []);
  }
  const groups = (groupRows ?? []).map(toGroupSummary);
  if (groups.length === 0) {
    return [];
  }
  // One aggregate read instead of one count query per group.
  const { data: memberRows, error: memberError } = await client
    .from("group_members")
    .select("group_id")
    .eq("status", "active")
    .in(
      "group_id",
      groups.map((group) => group.id),
    );
  if (memberError) {
    return softReadError(memberError, []);
  }
  const counts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
  }
  return groups.map((group) => ({
    ...group,
    memberCount: counts.get(group.id) ?? 0,
  }));
}

/** The Discover query options, shared by the hook and the nav prefetch. */
export function discoverGroupsQueryOptions(
  client: AppSupabaseClient | null = supabase,
) {
  return {
    queryKey: [...GROUP_QUERY_KEYS.discover] as const,
    queryFn: () =>
      !client || isSocialNotInstalled() ? [] : fetchDiscoverGroups(client),
    staleTime: GROUPS_STALE_TIME,
    enabled: client !== null,
    retry: false as const,
  };
}

/**
 * The public directory for the Discover tab: up to GROUPS_PAGE_SIZE public
 * groups, newest first, each with its active member count. Search, category,
 * language and sort run client side on this list (see discovery.ts).
 * Invite-only groups never appear: the query only reads public ones.
 */
export function useDiscoverGroups(
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<DiscoverGroup[], SocialFailure> {
  return useQuery<DiscoverGroup[], SocialFailure>(
    discoverGroupsQueryOptions(client),
  );
}

/** The signed-in user's active groups, ordered by name. */
export function useMyGroups(
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<GroupSummary[], SocialFailure> {
  const { user } = useAuth();
  return useQuery<GroupSummary[], SocialFailure>({
    queryKey: [...GROUP_QUERY_KEYS.mine, user?.id ?? null],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      const me = user?.id ?? null;
      if (!me) {
        return [];
      }
      const { data: memberRows, error: memberError } = await client
        .from("group_members")
        .select("group_id")
        .eq("user_id", me)
        .eq("status", "active");
      if (memberError) {
        return softReadError(memberError, []);
      }
      const groupIds = (memberRows ?? []).map((row) => row.group_id);
      if (groupIds.length === 0) {
        return [];
      }
      const { data: groupRows, error: groupError } = await client
        .from("groups")
        .select("*")
        .in("id", groupIds)
        .order("name", { ascending: true });
      if (groupError) {
        return softReadError(groupError, []);
      }
      return (groupRows ?? []).map(toGroupSummary);
    },
    staleTime: GROUPS_STALE_TIME,
    enabled: client !== null && user !== null,
    retry: false,
  });
}

/** One user's active groups, ordered by name. Public profiles use this. */
export function useUserGroups(
  userId: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<GroupSummary[], SocialFailure> {
  return useQuery<GroupSummary[], SocialFailure>({
    queryKey: [...GROUP_QUERY_KEYS.user, userId],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      const { data: memberRows, error: memberError } = await client
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId)
        .eq("status", "active");
      if (memberError) {
        return softReadError(memberError, []);
      }
      const groupIds = (memberRows ?? []).map((row) => row.group_id);
      if (groupIds.length === 0) {
        return [];
      }
      const { data: groupRows, error: groupError } = await client
        .from("groups")
        .select("*")
        .in("id", groupIds)
        .order("name", { ascending: true });
      if (groupError) {
        return softReadError(groupError, []);
      }
      return (groupRows ?? []).map(toGroupSummary);
    },
    enabled: client !== null && userId !== "",
    retry: false,
  });
}

/** One group by its slug. Null when no group has that slug. */
export function useGroupBySlug(
  slug: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<GroupSummary | null, SocialFailure> {
  return useQuery<GroupSummary | null, SocialFailure>({
    queryKey: [...GROUP_QUERY_KEYS.bySlug, slug],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return null;
      }
      const { data, error } = await client
        .from("groups")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) {
        return softReadError(error, null);
      }
      return data ? toGroupSummary(data) : null;
    },
    enabled: client !== null && slug !== "",
    retry: false,
  });
}

/**
 * The signed-in user's own membership row in one group: their role and
 * status, or null when they are not a member and have not been invited.
 */
export function useMyGroupMembership(
  groupId: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<MyGroupMembership | null, SocialFailure> {
  const { user } = useAuth();
  return useQuery<MyGroupMembership | null, SocialFailure>({
    queryKey: [...GROUP_QUERY_KEYS.myMembership, groupId, user?.id ?? null],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return null;
      }
      const me = user?.id ?? null;
      if (!me) {
        return null;
      }
      const { data, error } = await client
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .eq("user_id", me)
        .maybeSingle();
      if (error) {
        return softReadError(error, null);
      }
      return data ? toMyMembership(data) : null;
    },
    enabled: client !== null && groupId !== "" && user !== null,
    retry: false,
  });
}

/** The members of one group with their profiles, owners first, then names. */
export function useGroupMembers(
  groupId: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<GroupMember[], SocialFailure> {
  return useQuery<GroupMember[], SocialFailure>({
    queryKey: [...GROUP_QUERY_KEYS.members, groupId],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      const { data: memberRows, error: memberError } = await client
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });
      if (memberError) {
        return softReadError(memberError, []);
      }
      const rows = memberRows ?? [];
      const profileIds = [...new Set(rows.map((row) => row.user_id))];
      const profilesById = new Map<string, SocialProfileSummary>();
      if (profileIds.length > 0) {
        const { data: profileRows, error: profileError } = await client
          .from("profiles")
          .select("id, username, display_name, avatar_species")
          .in("id", profileIds);
        if (profileError) {
          return softReadError(profileError, []);
        }
        for (const row of profileRows ?? []) {
          profilesById.set(row.id, {
            id: row.id,
            username: row.username,
            displayName: row.display_name,
            avatarSpecies: row.avatar_species,
          });
        }
      }
      const roleRank: Record<string, number> = {
        owner: 0,
        moderator: 1,
        member: 2,
      };
      return rows
        .map((row) => ({
          userId: row.user_id,
          role: asGroupRole(row.role),
          status: asGroupMemberStatus(row.status),
          joinedAt: row.created_at,
          profile: profilesById.get(row.user_id) ?? null,
        }))
        .sort((a, b) => {
          const byRole = (roleRank[a.role] ?? 3) - (roleRank[b.role] ?? 3);
          if (byRole !== 0) {
            return byRole;
          }
          return a.joinedAt.localeCompare(b.joinedAt);
        });
    },
    enabled: client !== null && groupId !== "",
    retry: false,
  });
}

/** How many active members one group has. */
export function useGroupMemberCount(
  groupId: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<number, SocialFailure> {
  return useQuery<number, SocialFailure>({
    queryKey: [...GROUP_QUERY_KEYS.memberCount, groupId],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return 0;
      }
      const { count, error } = await client
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId)
        .eq("status", "active");
      if (error) {
        return softReadError(error, 0);
      }
      return count ?? 0;
    },
    enabled: client !== null && groupId !== "",
    retry: false,
  });
}

export type GroupQueryKey = QueryKey;
