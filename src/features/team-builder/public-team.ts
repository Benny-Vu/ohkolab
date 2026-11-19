import { useQuery } from "@tanstack/react-query";

import { rowToTeam } from "@/lib/team/cloud-team-store";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import type { Team } from "@/types/team";

/**
 * Looking up a team that is not the visitor's own: a public team another
 * player shared, opened through its `/teams/<id>` link. Anon reads it
 * through the `public teams are readable` RLS policy, so the link only
 * ever works for teams the owner made public.
 */

/** A public team plus the id of the player who shared it. */
export interface PublicTeam {
  team: Team | null;
  ownerId: string;
}

/** The public team with this id, or null when there is none to see. */
export function usePublicTeam(
  teamId: string,
  client: AppSupabaseClient | null = supabase,
) {
  return useQuery({
    queryKey: ["public-team", teamId],
    enabled: client !== null && teamId !== "",
    queryFn: async (): Promise<PublicTeam | null> => {
      if (!client) {
        throw new Error("Supabase is not configured");
      }
      const { data, error } = await client
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .eq("is_public", true)
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) return null;
      return { team: rowToTeam(data), ownerId: data.user_id };
    },
  });
}
