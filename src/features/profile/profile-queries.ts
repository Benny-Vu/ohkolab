import { useQuery } from "@tanstack/react-query";

import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import type { ProfileRow, TeamRow } from "@/lib/database.types";
import type { Profile } from "@/lib/auth/types";
import { sanitizeTeam } from "@/lib/team";
import type { Team } from "@/types/team";

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarSpecies: row.avatar_species,
    bio: row.bio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTeamRow(row: TeamRow): Team | null {
  return sanitizeTeam({
    id: row.id,
    name: row.name,
    format: row.format,
    members: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
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
        .map(mapTeamRow)
        .filter((team): team is Team => team !== null);
    },
  });
}
