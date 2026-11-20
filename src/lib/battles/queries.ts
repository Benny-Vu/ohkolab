/**
 * Battle-board reads: the public board with filters, my own requests, one
 * request's offers and the matched pair's in-game code. Every hook here is
 * disabled unless `battlesEnabled()` is true, so a build without the
 * feature never queries its tables — the migration may not be applied yet
 * (the `VITE_DIRECT_MESSAGES` pattern).
 */

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { battlesEnabled } from "@/lib/battles/flag";

import {
  applyBattleFilter,
  summarizeBattleRequests,
  summarizeBattleReplies,
  type BattleAuthorLite,
  type BattleFilter,
  type BattleReplyLite,
  type BattleReplySummary,
  type BattleRequestLite,
  type BattleRequestSummary,
  type BattleTeamLite,
} from "@/lib/battles/logic";

/**
 * Reads fail soft, like the direct-message layer: an unapplied migration or
 * a failed request renders an empty board instead of an error screen.
 */
function softEmpty<T>(error: unknown, empty: T): T {
  void error;
  return empty;
}

const REQUEST_COLUMNS =
  "id, author_id, format, rules, note, starts_at, ends_at, timezone, language, team_id, status, accepted_reply_id, played_at, created_at, updated_at";
const AUTHOR_COLUMNS = "id, username, display_name, avatar_species";
const REPLY_COLUMNS = "id, request_id, responder_id, status, created_at";
/** The board only ever shows public teams; RLS would hide the rest anyway. */
const TEAM_COLUMNS = "id, name, format, is_public, data, game_team_id";

/** Up to this many open requests load at once; expiry keeps the board short. */
const BOARD_LIMIT = 100;

/** Fetches the distinct authors' profiles for the given requests. */
async function fetchAuthors(
  client: AppSupabaseClient,
  requests: BattleRequestLite[],
): Promise<BattleAuthorLite[]> {
  const ids = [...new Set(requests.map((request) => request.author_id))];
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await client
    .from("profiles")
    .select(AUTHOR_COLUMNS)
    .in("id", ids);
  if (error) {
    return softEmpty(error, []);
  }
  return (data ?? []) as unknown as BattleAuthorLite[];
}

/** Fetches the distinct attached teams (public ones only, like the cards). */
async function fetchTeams(
  client: AppSupabaseClient,
  requests: BattleRequestLite[],
): Promise<BattleTeamLite[]> {
  const ids = [
    ...new Set(
      requests
        .map((request) => request.team_id)
        .filter((id): id is string => id !== null),
    ),
  ];
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await client
    .from("teams")
    .select(TEAM_COLUMNS)
    .eq("is_public", true)
    .in("id", ids);
  if (error) {
    return softEmpty(error, []);
  }
  return (data ?? []) as unknown as BattleTeamLite[];
}

/** The public board: live-open requests, filtered, with authors and teams. */
export function useBattleBoard(
  filter: BattleFilter,
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  return useQuery<BattleRequestSummary[]>({
    queryKey: ["battles", "board", filter, user?.id ?? null],
    enabled: battlesEnabled() && client !== null,
    retry: false,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await client!
        .from("battle_requests")
        .select(REQUEST_COLUMNS)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(BOARD_LIMIT);
      if (error) {
        return softEmpty(error, []);
      }
      const rows = (data ?? []) as unknown as BattleRequestLite[];
      const now = new Date();
      const live = applyBattleFilter(rows, filter, now);
      const authors = await fetchAuthors(client!, live);
      const teams = await fetchTeams(client!, live);
      return summarizeBattleRequests(live, authors, teams);
    },
  });
}

/** My own requests, any status, newest first (the "my requests" panel). */
export function useMyBattleRequests(
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  return useQuery<BattleRequestSummary[]>({
    queryKey: ["battles", "mine", user?.id ?? null],
    enabled: battlesEnabled() && client !== null && user !== null,
    retry: false,
    queryFn: async () => {
      const { data, error } = await client!
        .from("battle_requests")
        .select(REQUEST_COLUMNS)
        .eq("author_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) {
        return softEmpty(error, []);
      }
      const rows = (data ?? []) as unknown as BattleRequestLite[];
      const authors = await fetchAuthors(client!, rows);
      const teams = await fetchTeams(client!, rows);
      return summarizeBattleRequests(rows, authors, teams);
    },
  });
}

/** One request by id, with its author and attached team. */
export function useBattleRequest(
  requestId: string,
  client: AppSupabaseClient | null = supabase,
) {
  return useQuery<BattleRequestSummary | null>({
    queryKey: ["battles", "request", requestId],
    enabled: battlesEnabled() && client !== null && requestId !== "",
    retry: false,
    queryFn: async () => {
      const { data, error } = await client!
        .from("battle_requests")
        .select(REQUEST_COLUMNS)
        .eq("id", requestId)
        .maybeSingle();
      if (error) {
        return softEmpty(error, null);
      }
      const row = (data ?? null) as unknown as BattleRequestLite | null;
      if (row === null) {
        return null;
      }
      const authors = await fetchAuthors(client!, [row]);
      const teams = await fetchTeams(client!, [row]);
      return summarizeBattleRequests([row], authors, teams)[0] ?? null;
    },
  });
}

/** The offers on one request, with each responder's profile (author view). */
export function useBattleReplies(
  requestId: string,
  client: AppSupabaseClient | null = supabase,
) {
  return useQuery<BattleReplySummary[]>({
    queryKey: ["battles", "replies", requestId],
    enabled: battlesEnabled() && client !== null && requestId !== "",
    retry: false,
    queryFn: async () => {
      const { data, error } = await client!
        .from("battle_replies")
        .select(REPLY_COLUMNS)
        .eq("request_id", requestId)
        .order("created_at", { ascending: false });
      if (error) {
        return softEmpty(error, []);
      }
      const rows = (data ?? []) as unknown as BattleReplyLite[];
      const responderIds = [...new Set(rows.map((row) => row.responder_id))];
      let responders: BattleAuthorLite[] = [];
      if (responderIds.length > 0) {
        const { data: profiles, error: profilesError } = await client!
          .from("profiles")
          .select(AUTHOR_COLUMNS)
          .in("id", responderIds);
        if (profilesError) {
          return softEmpty(profilesError, []);
        }
        responders = (profiles ?? []) as unknown as BattleAuthorLite[];
      }
      return summarizeBattleReplies(rows, responders);
    },
  });
}

/** The matched pair's in-game code for one request (null while unset). */
export function useBattleCode(
  requestId: string,
  client: AppSupabaseClient | null = supabase,
) {
  return useQuery<string | null>({
    queryKey: ["battles", "code", requestId],
    enabled: battlesEnabled() && client !== null && requestId !== "",
    retry: false,
    queryFn: async () => {
      const { data, error } = await client!
        .from("battle_request_codes")
        .select("request_id, code")
        .eq("request_id", requestId)
        .maybeSingle();
      if (error) {
        return softEmpty(error, null);
      }
      return ((data as { code?: string } | null)?.code as string) ?? null;
    },
  });
}
