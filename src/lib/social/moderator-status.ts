import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

import { isSocialNotInstalled, softReadError } from "@/lib/social/availability";
import { describeSocialError, type SocialFailure } from "@/lib/social/errors";

/**
 * Whether the signed-in user has moderator privileges.
 *
 * Kept in this small module of its own, away from the big
 * `@/lib/social/queries` barrel-mate: the app shell (the account menu) is the
 * only entry-chunk consumer, and importing it from `queries.ts` would drag the
 * whole social data layer — image posts included — into the entry chunk.
 */
export function useIsModerator(
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<boolean, SocialFailure> {
  const { user } = useAuth();
  return useQuery<boolean, SocialFailure>({
    queryKey: ["social", "is-moderator", user?.id ?? null],
    queryFn: async () => {
      // Moderator status only exists for a signed-in user; the RPC is revoked
      // for the anon role, so calling it signed out is a guaranteed 401.
      if (!user) {
        return false;
      }
      if (!client || isSocialNotInstalled()) {
        return false;
      }
      try {
        const { data, error } = await client.rpc("is_moderator");
        if (error) {
          return softReadError(error, false);
        }
        return data === true;
      } catch (error) {
        // A session that expired mid-visit, or a call the grants do not
        // cover, simply means "not a moderator"; anything else stays an
        // error.
        const failure = describeSocialError(error);
        if (failure.code === "not_signed_in" || failure.code === "forbidden") {
          return false;
        }
        throw error;
      }
    },
    enabled: client !== null,
    retry: false,
  });
}
