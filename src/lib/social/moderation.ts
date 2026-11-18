/**
 * Moderation hooks. All moderation writes go through security-definer
 * functions (remove_post_with_reason, remove_comment_with_reason,
 * handle_report, suspend_user_with_reason, handle_appeal); nothing here
 * writes to the tables directly. Every removal and suspension carries a
 * reason, which the database records in moderation_actions and shows to
 * the affected user.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import type {
  AppealRow,
  ModerationActionRow,
  UserSuspensionRow,
} from "@/lib/database.types";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

import {
  describeWriteError,
  isSocialNotInstalled,
  softReadError,
} from "@/lib/social/availability";
import {
  socialFail,
  socialSucceed,
  type SocialFailure,
  type SocialResult,
} from "@/lib/social/errors";
import {
  normalizeModerationReason,
  normalizeSuspensionReason,
  validateModerationReason,
  validateSuspensionReason,
  validateSuspensionUntil,
  type ReportStatus,
} from "@/lib/social/validation";

/** Appeal message limits, matching the appeals table check constraint. */
export const APPEAL_MESSAGE_MIN = 1;
export const APPEAL_MESSAGE_MAX = 1000;

export const APPEAL_DECISIONS = ["upheld", "reversed"] as const;
export type AppealDecision = (typeof APPEAL_DECISIONS)[number];

/** 100 years: the "permanent" suspension duration. */
export const PERMANENT_SUSPENSION_DAYS = 36_500;

/** Returns the ISO timestamp a suspension of the given days ends at. */
export function suspendUntil(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export function normalizeAppealMessage(message: string): string {
  return message.trim();
}

/** Returns a user-facing message when an appeal message is invalid, or null when valid. */
export function validateAppealMessage(message: string): string | null {
  if (message.length < APPEAL_MESSAGE_MIN) {
    return "Write a message for the moderators.";
  }
  if (message.length > APPEAL_MESSAGE_MAX) {
    return `Appeals are limited to ${APPEAL_MESSAGE_MAX} characters.`;
  }
  return null;
}

export interface HandleReportInput {
  reportId: string;
  status: ReportStatus;
}

export interface RemoveContentInput {
  type: "post" | "comment";
  id: string;
  /** Why the content is being removed. Required, 1 to 500 characters. */
  reason: ModerationReason;
  /** The report being actioned, when the removal came from one. */
  reportId?: string;
}

export interface SuspendUserInput {
  userId: string;
  until: string;
  reason: string;
  /** The report being actioned, when the suspension came from one. */
  reportId?: string;
}

/**
 * A moderation reason: trimmed, 1 to 500 characters. The database records it
 * in moderation_actions and the affected user sees it with a link to appeal.
 */
export type ModerationReason = string;

/** Sets a report to "actioned" or "dismissed". Moderators only. */
export function useHandleReport(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  HandleReportInput
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, HandleReportInput>(
    {
      mutationFn: async (input): Promise<SocialResult<undefined>> => {
        if (isSocialNotInstalled()) return socialFail("not_installed");
        if (!client) return socialFail("not_configured");
        const me = user?.id ?? null;
        if (!me) return socialFail("not_signed_in");
        if (input.status === "open") {
          return socialFail(
            "invalid_input",
            "Choose whether to action or dismiss the report.",
          );
        }
        const { error } = await client.rpc("handle_report", {
          target_report_id: input.reportId,
          new_status: input.status,
        });
        if (error) return { ok: false, error: describeWriteError(error) };
        return socialSucceed();
      },
      onSuccess: (result) => {
        if (result.ok) {
          void queryClient.invalidateQueries({
            queryKey: ["social", "reports"],
          });
        }
      },
    },
  );
}

/** Marks a post or comment removed. Moderators only. */
export function useRemoveContent(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  RemoveContentInput
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    RemoveContentInput
  >({
    mutationFn: async (input): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      const reason = normalizeModerationReason(input.reason);
      const reasonError = validateModerationReason(reason);
      if (reasonError) return socialFail("invalid_input", reasonError);
      if (input.type === "post") {
        const { error } = await client.rpc("remove_post_with_reason", {
          target_post_id: input.id,
          removal_reason: reason,
          source_report_id: input.reportId,
        });
        if (error) return { ok: false, error: describeWriteError(error) };
      } else if (input.type === "comment") {
        const { error } = await client.rpc("remove_comment_with_reason", {
          target_comment_id: input.id,
          removal_reason: reason,
          source_report_id: input.reportId,
        });
        if (error) return { ok: false, error: describeWriteError(error) };
      } else {
        return socialFail(
          "invalid_input",
          "Choose a post or a comment to remove.",
        );
      }
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: ["social"] });
      }
    },
  });
}

/** Suspends a user until a given time. Moderators only. */
export function useSuspendUser(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<undefined>, SocialFailure, SuspendUserInput> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, SuspendUserInput>({
    mutationFn: async (input): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      const reason = normalizeSuspensionReason(input.reason);
      const reasonError = validateSuspensionReason(reason);
      if (reasonError) return socialFail("invalid_input", reasonError);
      const untilError = validateSuspensionUntil(input.until);
      if (untilError) return socialFail("invalid_input", untilError);
      const { error } = await client.rpc("suspend_user_with_reason", {
        target_user_id: input.userId,
        suspend_until: input.until,
        suspension_reason: reason,
        source_report_id: input.reportId,
      });
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: ["social"] });
      }
    },
  });
}

export interface HandleAppealInput {
  appealId: string;
  decision: AppealDecision;
}

/** Upholds or reverses an open appeal. Moderators only. */
export function useHandleAppeal(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  HandleAppealInput
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, HandleAppealInput>(
    {
      mutationFn: async (input): Promise<SocialResult<undefined>> => {
        if (isSocialNotInstalled()) return socialFail("not_installed");
        if (!client) return socialFail("not_configured");
        const me = user?.id ?? null;
        if (!me) return socialFail("not_signed_in");
        if (!APPEAL_DECISIONS.includes(input.decision)) {
          return socialFail(
            "invalid_input",
            "Choose whether to uphold or reverse the appeal.",
          );
        }
        const { error } = await client.rpc("handle_appeal", {
          target_appeal_id: input.appealId,
          decision: input.decision,
        });
        if (error) return { ok: false, error: describeWriteError(error) };
        return socialSucceed();
      },
      onSuccess: (result) => {
        if (result.ok) {
          void queryClient.invalidateQueries({
            queryKey: ["social", "appeals"],
          });
        }
      },
    },
  );
}

export interface CreateAppealInput {
  moderationActionId: string;
  message: string;
}

/** Files an appeal as the signed-in user against one moderation action. */
export function useCreateAppeal(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  CreateAppealInput
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, CreateAppealInput>(
    {
      mutationFn: async (input): Promise<SocialResult<undefined>> => {
        if (isSocialNotInstalled()) return socialFail("not_installed");
        if (!client) return socialFail("not_configured");
        const me = user?.id ?? null;
        if (!me) return socialFail("not_signed_in");
        const message = normalizeAppealMessage(input.message);
        const messageError = validateAppealMessage(message);
        if (messageError) return socialFail("invalid_input", messageError);
        const { error } = await client.from("appeals").insert({
          moderation_action_id: input.moderationActionId,
          appellant_id: me,
          message,
        });
        if (error) return { ok: false, error: describeWriteError(error) };
        return socialSucceed();
      },
      onSuccess: (result) => {
        if (result.ok) {
          void queryClient.invalidateQueries({
            queryKey: ["social", "appeals"],
          });
        }
      },
    },
  );
}

/** The user who filed an appeal, embedded from profiles. */
export interface AppealAppellant {
  username: string;
  display_name: string | null;
  avatar_species: string | null;
}

/** An open appeal together with the moderation action it appeals. */
export interface AppealWithAction {
  appeal: AppealRow;
  action: ModerationActionRow | null;
  appellant: AppealAppellant | null;
}

/** Moderation queue: open appeals with their original action, newest first. */
export function useAppeals(
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<AppealWithAction[], SocialFailure> {
  const { user } = useAuth();
  return useQuery<AppealWithAction[], SocialFailure>({
    queryKey: ["social", "appeals", "open"],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      const { data, error } = await client
        .from("appeals")
        .select(
          "*, moderation_actions(*), appellant:profiles!appeals_appellant_id_fkey(username, display_name, avatar_species)",
        )
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) {
        return softReadError(error, []);
      }
      return (data ?? []).map((row) => {
        const { moderation_actions, appellant, ...appeal } =
          row as unknown as AppealRow & {
            moderation_actions?: ModerationActionRow | null;
            appellant?: AppealAppellant | null;
          };
        return {
          appeal,
          action: moderation_actions ?? null,
          appellant: appellant ?? null,
        };
      });
    },
    enabled: client !== null && user !== null,
    retry: false,
  });
}

/** One moderation action, readable by the affected user and moderators. */
export function useModerationAction(
  actionId: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<ModerationActionRow | null, SocialFailure> {
  const { user } = useAuth();
  return useQuery<ModerationActionRow | null, SocialFailure>({
    queryKey: ["social", "moderation-action", actionId],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return null;
      }
      const { data, error } = await client
        .from("moderation_actions")
        .select("*")
        .eq("id", actionId)
        .maybeSingle();
      if (error) {
        return softReadError(error, null);
      }
      return (data as ModerationActionRow | null) ?? null;
    },
    enabled: client !== null && actionId !== "" && user !== null,
    retry: false,
  });
}

/** The appeal filed against one moderation action, when there is one. */
export function useAppealForAction(
  actionId: string,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<AppealRow | null, SocialFailure> {
  const { user } = useAuth();
  return useQuery<AppealRow | null, SocialFailure>({
    queryKey: ["social", "appeals", "action", actionId],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return null;
      }
      const { data, error } = await client
        .from("appeals")
        .select("*")
        .eq("moderation_action_id", actionId)
        .maybeSingle();
      if (error) {
        return softReadError(error, null);
      }
      return (data as AppealRow | null) ?? null;
    },
    enabled: client !== null && actionId !== "" && user !== null,
    retry: false,
  });
}

/** The signed-in user's suspensions, newest first. */
export function useOwnSuspensions(
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<UserSuspensionRow[], SocialFailure> {
  const { user } = useAuth();
  return useQuery<UserSuspensionRow[], SocialFailure>({
    queryKey: ["social", "suspensions", user?.id ?? null],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      const me = user?.id ?? null;
      if (!me) {
        return [];
      }
      const { data, error } = await client
        .from("user_suspensions")
        .select("*")
        .eq("user_id", me)
        .order("created_at", { ascending: false });
      if (error) {
        return softReadError(error, []);
      }
      return data ?? [];
    },
    enabled: client !== null && user !== null,
    retry: false,
  });
}
