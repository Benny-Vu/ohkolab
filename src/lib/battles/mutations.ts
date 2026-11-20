/**
 * Battle-board writes: create a request, offer to battle, accept or decline
 * an offer, withdraw, close, mark played, and set the matched pair's
 * in-game code. Every rule (blocks, minors, rate limits, team ownership)
 * lives in the database; these mutations only shape the payloads and
 * invalidate the reads. The hooks stay disabled unless `battlesEnabled()`.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

import type { BattleRequestInsert } from "@/lib/database.types";

/** What creating a request takes, all validated server side too. */
export type NewBattleRequest = Omit<BattleRequestInsert, "author_id">;

/** Surfaces the raw error; the UI maps codes to friendly i18n strings. */
type BattleMutationError = { message: string };

/** The invalidations every successful write shares. */
function battleInvalidations(
  queryClient: ReturnType<typeof useQueryClient>,
  requestId: string | null,
): void {
  // The board and "my requests" change on create, close and match.
  queryClient.invalidateQueries({ queryKey: ["battles", "board"] });
  queryClient.invalidateQueries({ queryKey: ["battles", "mine"] });
  queryClient.invalidateQueries({ queryKey: ["battles", "my-matches"] });
  // The shared "my offers" read feeds every card's OfferStatus.
  queryClient.invalidateQueries({ queryKey: ["battles", "my-offers"] });
  if (requestId !== null) {
    queryClient.invalidateQueries({
      queryKey: ["battles", "request", requestId],
    });
    queryClient.invalidateQueries({
      queryKey: ["battles", "replies", requestId],
    });
    queryClient.invalidateQueries({
      queryKey: ["battles", "code", requestId],
    });
  }
}

/** Creates a battle request as the signed-in user. */
export function useCreateBattleRequest(
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["battles", "create", user?.id ?? null],
    mutationFn: async (input: NewBattleRequest) => {
      const { data, error } = await client!
        .from("battle_requests")
        .insert({ ...input, author_id: user!.id })
        .select("id")
        .single();
      if (error) {
        throw { message: error.message } satisfies BattleMutationError;
      }
      return (data as { id: string }).id;
    },
    onSuccess: () => battleInvalidations(queryClient, null),
  });
}

/** Offers to battle on someone else's open request. */
export function useOfferToBattle(client: AppSupabaseClient | null = supabase) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["battles", "offer", user?.id ?? null],
    mutationFn: async (requestId: string) => {
      const { error } = await client!
        .from("battle_replies")
        .insert({ request_id: requestId, responder_id: user!.id });
      if (error) {
        throw { message: error.message } satisfies BattleMutationError;
      }
    },
    onSuccess: (_result, requestId) =>
      battleInvalidations(queryClient, requestId),
  });
}

/**
 * The author accepts one pending offer. Returns the DM conversation id, or
 * null when the messaging rules forbade the thread — the matched pair then
 * exchanges the in-game code inside the request instead.
 */
export function useAcceptBattleOffer(
  client: AppSupabaseClient | null = supabase,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["battles", "accept"],
    mutationFn: async (replyId: string) => {
      const { data, error } = await client!.rpc("accept_battle_reply", {
        reply_id: replyId,
      });
      if (error) {
        throw { message: error.message } satisfies BattleMutationError;
      }
      // The RPC returns one uuid (or null when no DM could be opened).
      return (data as string | null) ?? null;
    },
    onSuccess: () => {
      battleInvalidations(queryClient, null);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** The author declines one pending offer. */
export function useDeclineBattleOffer(
  client: AppSupabaseClient | null = supabase,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["battles", "decline"],
    mutationFn: async (replyId: string) => {
      const { error } = await client!
        .from("battle_replies")
        .update({ status: "declined" })
        .eq("id", replyId);
      if (error) {
        throw { message: error.message } satisfies BattleMutationError;
      }
    },
    onSuccess: () => battleInvalidations(queryClient, null),
  });
}

/** The responder takes their own pending offer back. */
export function useWithdrawBattleOffer(
  client: AppSupabaseClient | null = supabase,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["battles", "withdraw"],
    mutationFn: async (replyId: string) => {
      const { error } = await client!
        .from("battle_replies")
        .update({ status: "withdrawn" })
        .eq("id", replyId);
      if (error) {
        throw { message: error.message } satisfies BattleMutationError;
      }
    },
    onSuccess: () => battleInvalidations(queryClient, null),
  });
}

/** The author closes (or reopens, from closed) their request. */
export function useSetBattleRequestOpen(
  client: AppSupabaseClient | null = supabase,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["battles", "set-open"],
    mutationFn: async (input: { requestId: string; open: boolean }) => {
      const { error } = await client!
        .from("battle_requests")
        .update({ status: input.open ? "open" : "closed" })
        .eq("id", input.requestId);
      if (error) {
        throw { message: error.message } satisfies BattleMutationError;
      }
    },
    onSuccess: (_result, input) =>
      battleInvalidations(queryClient, input.requestId),
  });
}

/**
 * Either matched player marks the battle played, through the RPC: clients
 * have no update grant on played_at, so no policy can be ORed into letting
 * players flip a matched request's status.
 */
export function useMarkBattlePlayed(
  client: AppSupabaseClient | null = supabase,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["battles", "mark-played"],
    mutationFn: async (requestId: string) => {
      const { error } = await client!.rpc("mark_battle_played", {
        request_id: requestId,
      });
      if (error) {
        throw { message: error.message } satisfies BattleMutationError;
      }
    },
    onSuccess: (_data, requestId) =>
      battleInvalidations(queryClient, requestId),
  });
}

/** Either matched player sets or replaces the request's in-game code. */
export function useSetBattleCode(client: AppSupabaseClient | null = supabase) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["battles", "set-code"],
    mutationFn: async (input: { requestId: string; code: string }) => {
      const { error } = await client!
        .from("battle_request_codes")
        .upsert(
          { request_id: input.requestId, code: input.code },
          { onConflict: "request_id" },
        );
      if (error) {
        throw { message: error.message } satisfies BattleMutationError;
      }
    },
    onSuccess: (_result, input) =>
      battleInvalidations(queryClient, input.requestId),
  });
}

/** Reports a battle request through the existing moderation queue. */
export function useReportBattleRequest(
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  return useMutation({
    mutationKey: ["battles", "report", user?.id ?? null],
    mutationFn: async (input: { requestId: string; reason: string }) => {
      const { error } = await client!.from("reports").insert({
        reporter_id: user!.id,
        target_type: "battle_request",
        target_id: input.requestId,
        reason: input.reason,
      });
      if (error) {
        throw { message: error.message } satisfies BattleMutationError;
      }
    },
  });
}
