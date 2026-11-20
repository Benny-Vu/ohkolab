import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { battlesEnabled } from "@/lib/battles/flag";

/**
 * The signed-in user's own PUBLIC teams, for the create form's optional team
 * picker. A private team never joins a battle request: the board's cards only
 * ever show public teams, so only public ones are offered here. Like the other
 * battle reads, the hook stays disabled while the flag is off.
 */
export function useMyPublicTeams(client: AppSupabaseClient | null = supabase) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["battles", "my-public-teams", user?.id ?? null],
    enabled: battlesEnabled() && client !== null && user !== null,
    retry: false,
    queryFn: async () => {
      const { data, error } = await client!
        .from("teams")
        .select("id, name")
        .eq("user_id", user!.id)
        .eq("is_public", true)
        .order("updated_at", { ascending: false });
      if (error) {
        return [];
      }
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
}
