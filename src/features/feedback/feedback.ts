/**
 * The feedback data layer: inserts into the feedback table for signed-in
 * users and the moderator queue for staff. Follows the social layer's
 * patterns (SocialResult, describeWriteError, softReadError).
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import type { FeedbackRow } from "@/lib/database.types";
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

/** Feedback message limits, matching the feedback table check constraint. */
export const FEEDBACK_MESSAGE_MIN = 10;
export const FEEDBACK_MESSAGE_MAX = 2000;

export const FEEDBACK_KINDS = ["bug", "idea", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export type FeedbackStatus = "new" | "seen" | "done";

/** Technical details attached to feedback when the user opts in. */
export interface FeedbackContext {
  [key: string]: string | undefined;
  page?: string;
  app_version?: string;
  browser?: string;
  screen_size?: string;
  crash_id?: string;
}

export function normalizeFeedbackMessage(message: string): string {
  return message.trim();
}

/** Returns a user-facing message when feedback is invalid, or null when valid. */
export function validateFeedbackMessage(message: string): string | null {
  if (message.length < FEEDBACK_MESSAGE_MIN) {
    return "Tell us a bit more (at least 10 characters).";
  }
  if (message.length > FEEDBACK_MESSAGE_MAX) {
    return `Feedback is limited to ${FEEDBACK_MESSAGE_MAX} characters.`;
  }
  return null;
}

export function isFeedbackKind(value: string): value is FeedbackKind {
  return (FEEDBACK_KINDS as readonly string[]).includes(value);
}

export interface SendFeedbackInput {
  kind: FeedbackKind;
  message: string;
  context: FeedbackContext | null;
}

/** Sends feedback as the signed-in user. */
export function useSendFeedback(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  SendFeedbackInput
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, SendFeedbackInput>(
    {
      mutationFn: async (input): Promise<SocialResult<undefined>> => {
        if (isSocialNotInstalled()) return socialFail("not_installed");
        if (!client) return socialFail("not_configured");
        const me = user?.id ?? null;
        if (!me) return socialFail("not_signed_in");
        const message = normalizeFeedbackMessage(input.message);
        const messageError = validateFeedbackMessage(message);
        if (messageError) return socialFail("invalid_input", messageError);
        if (!isFeedbackKind(input.kind)) {
          return socialFail("invalid_input", "Choose a feedback kind.");
        }
        const { error } = await client.from("feedback").insert({
          user_id: me,
          kind: input.kind,
          message,
          context: input.context,
        });
        if (error) return { ok: false, error: describeWriteError(error) };
        return socialSucceed();
      },
      onSuccess: (result) => {
        if (result.ok) {
          void queryClient.invalidateQueries({ queryKey: ["feedback"] });
        }
      },
    },
  );
}

/** Moderator queue: feedback with the given status, newest first. */
export function useFeedback(
  status: FeedbackStatus,
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<FeedbackRow[], SocialFailure> {
  const { user } = useAuth();
  return useQuery<FeedbackRow[], SocialFailure>({
    queryKey: ["feedback", "list", status],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      const { data, error } = await client
        .from("feedback")
        .select("*")
        .eq("status", status)
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

export interface SetFeedbackStatusInput {
  feedbackId: string;
  status: FeedbackStatus;
}

/** Marks feedback seen or done. Moderators only, via set_feedback_status. */
export function useSetFeedbackStatus(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<undefined>,
  SocialFailure,
  SetFeedbackStatusInput
> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    SocialResult<undefined>,
    SocialFailure,
    SetFeedbackStatusInput
  >({
    mutationFn: async (input): Promise<SocialResult<undefined>> => {
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      if (input.status === "new") {
        return socialFail(
          "invalid_input",
          "Feedback can only be marked as seen or done.",
        );
      }
      const { error } = await client.rpc("set_feedback_status", {
        feedback_id: input.feedbackId,
        new_status: input.status,
      });
      if (error) return { ok: false, error: describeWriteError(error) };
      return socialSucceed();
    },
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: ["feedback"] });
      }
    },
  });
}
