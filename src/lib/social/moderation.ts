/**
 * Moderation hooks. All moderation writes go through security-definer
 * functions (remove_post, remove_comment, handle_report, suspend_user);
 * nothing here writes to the tables directly.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/use-auth";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

import {
  describeWriteError,
  isSocialNotInstalled,
} from "@/lib/social/availability";
import {
  socialFail,
  socialSucceed,
  type SocialFailure,
  type SocialResult,
} from "@/lib/social/errors";
import {
  normalizeSuspensionReason,
  validateSuspensionReason,
  validateSuspensionUntil,
  type ReportStatus,
} from "@/lib/social/validation";

export interface HandleReportInput {
  reportId: string;
  status: ReportStatus;
}

export interface RemoveContentInput {
  type: "post" | "comment";
  id: string;
}

export interface SuspendUserInput {
  userId: string;
  until: string;
  reason: string;
}

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
      if (input.type === "post") {
        const { error } = await client.rpc("remove_post", {
          target_post_id: input.id,
        });
        if (error) return { ok: false, error: describeWriteError(error) };
      } else if (input.type === "comment") {
        const { error } = await client.rpc("remove_comment", {
          target_comment_id: input.id,
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
      const { error } = await client.rpc("suspend_user", {
        target_user_id: input.userId,
        suspend_until: input.until,
        suspension_reason: reason,
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
