/**
 * "People to follow": the client side of the suggest_users RPC. The ranking
 * and the exclusions (already followed, blocked, suspended) run server side
 * in the security-definer function; this module only calls it, maps the
 * public profile fields, and filters out suggestions the user dismissed.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

import { isSocialNotInstalled, softReadError } from "@/lib/social/availability";
import type { SocialFailure } from "@/lib/social/errors";

import {
  readDismissedSuggestions,
  dismissedSuggestionsKey,
} from "@/lib/social/suggestion-dismissals";

/** How many suggestions the RPC returns. */
export const FOLLOW_SUGGESTION_LIMIT = 10;

/** The query key prefix for follow suggestions; the user id is appended. */
export const FOLLOW_SUGGESTIONS_QUERY_KEY = [
  "social",
  "follow-suggestions",
] as const;

/** One row as the RPC returns it. Public profile fields plus the score. */
export interface FollowSuggestionRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_species: string | null;
  main_format: string | null;
  score: number;
}

/** One suggestion as the screens show it. */
export interface FollowSuggestion {
  id: string;
  username: string;
  displayName: string | null;
  avatarSpecies: string | null;
  mainFormat: "singles" | "doubles" | "both" | null;
  score: number;
}

/** Narrows the RPC's main_format to the values the client understands. */
export function toFollowSuggestion(row: FollowSuggestionRow): FollowSuggestion {
  const mainFormat =
    row.main_format === "singles" ||
    row.main_format === "doubles" ||
    row.main_format === "both"
      ? row.main_format
      : null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarSpecies: row.avatar_species,
    mainFormat,
    score: row.score,
  };
}

/**
 * Follow suggestions for the signed-in user, with dismissed ones filtered
 * out. Empty while signed out or while the social tables are missing.
 */
export function useFollowSuggestions(
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<FollowSuggestion[], SocialFailure> {
  const { user } = useAuth();
  const me = user?.id ?? null;
  return useQuery<FollowSuggestion[], SocialFailure>({
    queryKey: [...FOLLOW_SUGGESTIONS_QUERY_KEY, me],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      if (!me) {
        return [];
      }
      const { data, error } = await client.rpc("suggest_users", {
        p_limit: FOLLOW_SUGGESTION_LIMIT,
      });
      if (error) {
        return softReadError(error, []);
      }
      const rows = (data ?? []) as FollowSuggestionRow[];
      // A blocked or cleared store just means no dismissals are remembered.
      const dismissedIds = new Set(
        readDismissedSuggestions(dismissedSuggestionsKey(me)),
      );
      return rows
        .map(toFollowSuggestion)
        .filter((suggestion) => !dismissedIds.has(suggestion.id));
    },
    enabled: client !== null && me !== null,
    retry: false,
  });
}
