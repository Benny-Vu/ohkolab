import type { Json } from "@/lib/database.types";
import { t } from "@/lib/i18n/t";

/**
 * Shared limits between the social forms and the database constraints.
 * Keep in sync with supabase/migrations/20261117100000_social_foundation.sql.
 */

const POST_BODY_MIN = 1;
export const POST_BODY_MAX = 2000;

const COMMENT_BODY_MIN = 1;
export const COMMENT_BODY_MAX = 1000;

export const REPORT_DETAILS_MAX = 500;

const SUSPENSION_REASON_MIN = 1;
export const SUSPENSION_REASON_MAX = 500;

export const MODERATION_REASON_MIN = 1;
export const MODERATION_REASON_MAX = 500;

/** Maximum size of a post attachment, in bytes, measured on its JSON text. */
export const ATTACHMENT_MAX_BYTES = 8192;

const REPORT_TARGET_TYPES = ["post", "comment", "profile"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "inappropriate",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportStatus = "open" | "actioned" | "dismissed";

/**
 * The languages a post can be tagged with, mirroring the posts check
 * constraint. Null means untagged (pre-tag posts).
 */
export type PostLanguage = "en" | "ja";

/** Narrows an unknown value to a PostLanguage; anything else is untagged. */
export function asPostLanguage(
  language: string | null | undefined,
): PostLanguage | null {
  return language === "en" || language === "ja" ? language : null;
}

export function normalizePostBody(body: string): string {
  return body.trim();
}

/** Returns a user-facing message when the body is invalid, or null when valid. */
export function validatePostBody(body: string): string | null {
  if (body.length < POST_BODY_MIN) {
    return t("social.errPostEmpty");
  }
  if (body.length > POST_BODY_MAX) {
    return t("social.errPostMax", { max: POST_BODY_MAX });
  }
  return null;
}

export function normalizeCommentBody(body: string): string {
  return body.trim();
}

/** Returns a user-facing message when the body is invalid, or null when valid. */
export function validateCommentBody(body: string): string | null {
  if (body.length < COMMENT_BODY_MIN) {
    return t("social.errCommentEmpty");
  }
  if (body.length > COMMENT_BODY_MAX) {
    return t("social.errCommentMax", { max: COMMENT_BODY_MAX });
  }
  return null;
}

export function normalizeReportDetails(details: string): string | null {
  const trimmed = details.trim();
  return trimmed === "" ? null : trimmed;
}

/** Returns a user-facing message when the details are invalid, or null when valid. */
export function validateReportDetails(details: string): string | null {
  if (details.length > REPORT_DETAILS_MAX) {
    return t("social.errDetailsMax", { max: REPORT_DETAILS_MAX });
  }
  return null;
}

/** Returns a user-facing message when the target is invalid, or null when valid. */
export function validateReportTarget(target: {
  type: string;
  id: string;
}): string | null {
  if (!REPORT_TARGET_TYPES.includes(target.type as ReportTargetType)) {
    return t("social.errTargetChoose");
  }
  if (target.id === "") {
    return t("social.errTargetId");
  }
  return null;
}

/** Returns a user-facing message when the reason is invalid, or null when valid. */
export function validateReportReason(reason: string): string | null {
  if (!REPORT_REASONS.includes(reason as ReportReason)) {
    return t("report.chooseReasonError");
  }
  return null;
}

export function normalizeSuspensionReason(reason: string): string {
  return reason.trim();
}

export function normalizeModerationReason(reason: string): string {
  return reason.trim();
}

/** Returns a user-facing message when a moderation reason is invalid, or null when valid. */
export function validateModerationReason(reason: string): string | null {
  if (reason.length < MODERATION_REASON_MIN) {
    return t("social.errModerationReasonEmpty");
  }
  if (reason.length > MODERATION_REASON_MAX) {
    return t("social.errReasonsMax", { max: MODERATION_REASON_MAX });
  }
  return null;
}

/** Returns a user-facing message when the reason is invalid, or null when valid. */
export function validateSuspensionReason(reason: string): string | null {
  if (reason.length < SUSPENSION_REASON_MIN) {
    return t("social.errSuspensionReasonEmpty");
  }
  if (reason.length > SUSPENSION_REASON_MAX) {
    return t("social.errReasonsMax", { max: SUSPENSION_REASON_MAX });
  }
  return null;
}

/** Returns a user-facing message when the date is invalid, or null when valid. */
export function validateSuspensionUntil(until: string): string | null {
  const time = Date.parse(until);
  if (Number.isNaN(time)) {
    return t("social.errSuspensionDate");
  }
  if (time <= Date.now()) {
    return t("social.errSuspensionFuture");
  }
  return null;
}

/** Measures the JSON size of an attachment the same way the database does. */
export function measureAttachmentBytes(attachment: Json): number {
  return new TextEncoder().encode(JSON.stringify(attachment)).length;
}

/** Returns a user-facing message when the attachment is invalid, or null when valid. */
export function validateAttachment(attachment: Json | null): string | null {
  if (attachment === null) {
    return null;
  }
  if (typeof attachment !== "object") {
    return t("social.errAttachmentKind");
  }
  if (measureAttachmentBytes(attachment) > ATTACHMENT_MAX_BYTES) {
    return t("social.errAttachmentMax");
  }
  return null;
}
