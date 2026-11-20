import { useQuery } from "@tanstack/react-query";

import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import type { ProfileRow } from "@/lib/database.types";
import type { Profile } from "@/lib/auth/types";
import { rowToTeam } from "@/lib/team/cloud-team-store";
import type { Team } from "@/types/team";

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarSpecies: row.avatar_species,
    bio: row.bio,
    mainFormat: (row.main_format as Profile["mainFormat"]) ?? null,
    lookingFor: row.looking_for,
    youtubeUrl: row.youtube_url,
    twitchUrl: row.twitch_url,
    showdownName: row.showdown_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function usePublicProfile(
  username: string,
  client: AppSupabaseClient | null = supabase,
) {
  return useQuery({
    queryKey: ["public-profile", username],
    enabled: client !== null && username !== "",
    queryFn: async () => {
      if (!client) {
        throw new Error("Supabase is not configured");
      }
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data ? mapProfileRow(data) : null;
    },
  });
}

/** Profiles for a list of user ids, in the order the ids were given. */
export function useProfilesByIds(
  ids: string[],
  client: AppSupabaseClient | null = supabase,
) {
  return useQuery({
    queryKey: ["profiles-by-ids", [...ids].sort()],
    enabled: client !== null && ids.length > 0,
    retry: false,
    queryFn: async () => {
      if (!client) {
        throw new Error("Supabase is not configured");
      }
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .in("id", ids);
      if (error) {
        throw error;
      }
      const profiles = (data ?? []).map(mapProfileRow);
      const byId = new Map(profiles.map((profile) => [profile.id, profile]));
      return ids
        .map((id) => byId.get(id))
        .filter((profile): profile is Profile => profile !== undefined);
    },
  });
}

export function usePublicTeams(
  userId: string | null,
  client: AppSupabaseClient | null = supabase,
) {
  return useQuery({
    queryKey: ["public-teams", userId],
    enabled: client !== null && userId !== null,
    queryFn: async () => {
      if (!client || !userId) {
        throw new Error("Supabase is not configured");
      }
      const { data, error } = await client
        .from("teams")
        .select("*")
        .eq("user_id", userId)
        .eq("is_public", true)
        .order("created_at", { ascending: true });
      if (error) {
        throw error;
      }
      return (data ?? [])
        .map(rowToTeam)
        .filter((team): team is Team => team !== null);
    },
  });
}
