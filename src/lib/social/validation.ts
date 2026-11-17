import type { Json } from "@/lib/database.types";

/**
 * Shared limits between the social forms and the database constraints.
 * Keep in sync with supabase/migrations/20261117100000_social_foundation.sql.
 */

export const POST_BODY_MIN = 1;
export const POST_BODY_MAX = 2000;

export const COMMENT_BODY_MIN = 1;
export const COMMENT_BODY_MAX = 1000;

export const REPORT_DETAILS_MAX = 500;

export const SUSPENSION_REASON_MIN = 1;
export const SUSPENSION_REASON_MAX = 500;

/** Maximum size of a post attachment, in bytes, measured on its JSON text. */
export const ATTACHMENT_MAX_BYTES = 8192;

export const REPORT_TARGET_TYPES = ["post", "comment", "profile"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "inappropriate",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["open", "actioned", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export function normalizePostBody(body: string): string {
  return body.trim();
}

/** Returns a user-facing message when the body is invalid, or null when valid. */
export function validatePostBody(body: string): string | null {
  if (body.length < POST_BODY_MIN) {
    return "Write something before posting.";
  }
  if (body.length > POST_BODY_MAX) {
    return `Posts are limited to ${POST_BODY_MAX} characters.`;
  }
  return null;
}

export function normalizeCommentBody(body: string): string {
  return body.trim();
}

/** Returns a user-facing message when the body is invalid, or null when valid. */
export function validateCommentBody(body: string): string | null {
  if (body.length < COMMENT_BODY_MIN) {
    return "Write something before commenting.";
  }
  if (body.length > COMMENT_BODY_MAX) {
    return `Comments are limited to ${COMMENT_BODY_MAX} characters.`;
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
    return `Details are limited to ${REPORT_DETAILS_MAX} characters.`;
  }
  return null;
}

/** Returns a user-facing message when the target is invalid, or null when valid. */
export function validateReportTarget(target: {
  type: string;
  id: string;
}): string | null {
  if (!REPORT_TARGET_TYPES.includes(target.type as ReportTargetType)) {
    return "Choose what you are reporting.";
  }
  if (target.id === "") {
    return "The reported item could not be identified.";
  }
  return null;
}

/** Returns a user-facing message when the reason is invalid, or null when valid. */
export function validateReportReason(reason: string): string | null {
  if (!REPORT_REASONS.includes(reason as ReportReason)) {
    return "Choose a reason for the report.";
  }
  return null;
}

export function normalizeSuspensionReason(reason: string): string {
  return reason.trim();
}

/** Returns a user-facing message when the reason is invalid, or null when valid. */
export function validateSuspensionReason(reason: string): string | null {
  if (reason.length < SUSPENSION_REASON_MIN) {
    return "Write a reason for the suspension.";
  }
  if (reason.length > SUSPENSION_REASON_MAX) {
    return `Reasons are limited to ${SUSPENSION_REASON_MAX} characters.`;
  }
  return null;
}

/** Returns a user-facing message when the date is invalid, or null when valid. */
export function validateSuspensionUntil(until: string): string | null {
  const time = Date.parse(until);
  if (Number.isNaN(time)) {
    return "Choose a valid end date.";
  }
  if (time <= Date.now()) {
    return "The suspension must end in the future.";
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
    return "Attachments must be a team or calculation snapshot.";
  }
  if (measureAttachmentBytes(attachment) > ATTACHMENT_MAX_BYTES) {
    return "Attachments are limited to 8 KB.";
  }
  return null;
}
