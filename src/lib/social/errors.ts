/**
 * Error mapping for the social data layer: database errors become a small set
 * of codes with user-facing messages, so Phase 2 screens can react to
 * rate limits, suspensions and missing tables without parsing Postgres.
 * The messages come from the dictionaries (`social.errors.*`), so they
 * follow the active locale.
 */

import type { TranslationKey } from "@/lib/i18n/en";
import { t } from "@/lib/i18n/t";

export type SocialErrorCode =
  | "not_configured"
  | "not_installed"
  | "not_signed_in"
  | "rate_limited"
  | "suspended"
  | "too_long"
  | "not_found"
  | "forbidden"
  | "invalid_input"
  | "network"
  | "unknown";

export interface SocialFailure {
  code: SocialErrorCode;
  message: string;
}

export type SocialResult<T> =
  { ok: true; data: T } | { ok: false; error: SocialFailure };

const MESSAGE_KEYS: Record<SocialErrorCode, TranslationKey> = {
  not_configured: "social.errors.not_configured",
  not_installed: "social.errors.not_installed",
  not_signed_in: "social.errors.not_signed_in",
  rate_limited: "social.errors.rate_limited",
  suspended: "social.errors.suspended",
  too_long: "social.errors.too_long",
  not_found: "social.errors.not_found",
  forbidden: "social.errors.forbidden",
  invalid_input: "social.errors.invalid_input",
  network: "social.errors.network",
  unknown: "social.errors.unknown",
};

export function socialFailure(
  code: SocialErrorCode,
  message?: string,
): SocialFailure {
  return { code, message: message ?? t(MESSAGE_KEYS[code]) };
}

export function socialFail<T = never>(
  code: SocialErrorCode,
  message?: string,
): SocialResult<T> {
  return { ok: false, error: socialFailure(code, message) };
}

export function socialSucceed(): SocialResult<undefined>;
export function socialSucceed<T>(data: T): SocialResult<T>;
export function socialSucceed<T>(data?: T): SocialResult<T | undefined> {
  return { ok: true, data };
}

/**
 * Postgres error codes from the social migrations:
 * - P0A01: too many posts in 10 minutes
 * - P0A02: too many comments in 10 minutes
 * - P0A03: the user is suspended
 * - P0A04: too many reports in an hour
 * - P0A05: too many groups created in a day
 * - P0A06: too many feedback messages in an hour
 * - P0A07: too many post images in 24 hours
 */
const CODE_MAP: Record<string, SocialErrorCode> = {
  P0A01: "rate_limited",
  P0A02: "rate_limited",
  P0A03: "suspended",
  P0A04: "rate_limited",
  P0A05: "rate_limited",
  P0A06: "rate_limited",
  P0A07: "rate_limited",
  "22001": "too_long",
  "23514": "invalid_input",
  "42501": "forbidden",
  PGRST116: "not_found",
  PGRST301: "not_signed_in",
};

/**
 * Check-constraint names that mean "a value is too long"; a 23514 whose
 * message names one of these is reported as too_long instead of invalid_input.
 */
const LENGTH_CONSTRAINTS = [
  "posts_body_length",
  "comments_body_length",
  "reports_details_length",
  "user_suspensions_reason_length",
];

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") {
      return status;
    }
  }
  return null;
}

/** True when the error means a social table or function does not exist yet. */
export function isMissingRelationError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const code = readString((error as { code?: unknown }).code);
  return (
    code === "42P01" ||
    code === "42883" ||
    code === "PGRST202" ||
    code === "PGRST205"
  );
}

/** Maps any thrown or returned error to a SocialFailure. */
export function describeSocialError(error: unknown): SocialFailure {
  if (typeof error === "object" && error !== null) {
    const code = readString((error as { code?: unknown }).code);
    const message = readString((error as { message?: unknown }).message);

    if (
      code === "23514" &&
      LENGTH_CONSTRAINTS.some((name) => message.includes(name))
    ) {
      return socialFailure("too_long");
    }
    const mapped = CODE_MAP[code];
    if (mapped) {
      return socialFailure(mapped);
    }

    const status = readStatus(error);
    if (status === 401) {
      return socialFailure("not_signed_in");
    }
    if (status === 404) {
      return socialFailure("not_found");
    }
    if (status === 429) {
      return socialFailure("rate_limited");
    }
  }

  if (error instanceof TypeError) {
    return socialFailure("network");
  }
  if (
    typeof error === "object" &&
    error !== null &&
    /failed to fetch|network ?(error|request)|load failed/i.test(
      readString((error as { message?: unknown }).message),
    )
  ) {
    return socialFailure("network");
  }

  return socialFailure("unknown");
}
