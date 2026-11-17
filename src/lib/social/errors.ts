/**
 * Error mapping for the social data layer: database errors become a small set
 * of codes with user-facing messages, so Phase 2 screens can react to
 * rate limits, suspensions and missing tables without parsing Postgres.
 */

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

const MESSAGES: Record<SocialErrorCode, string> = {
  not_configured: "The community feed is not available right now.",
  not_installed: "The community feed is not set up yet. Try again later.",
  not_signed_in: "Sign in to use the community feed.",
  rate_limited:
    "You are posting too quickly. Wait a few minutes and try again.",
  suspended: "This account cannot post right now.",
  too_long: "That is too long. Shorten it and try again.",
  not_found: "That is no longer available.",
  forbidden: "You cannot do that.",
  invalid_input: "That input is not valid.",
  network: "Could not reach the server. Check your connection and try again.",
  unknown: "Something went wrong. Try again.",
};

export function socialFailure(
  code: SocialErrorCode,
  message?: string,
): SocialFailure {
  return { code, message: message ?? MESSAGES[code] };
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
 */
const CODE_MAP: Record<string, SocialErrorCode> = {
  P0A01: "rate_limited",
  P0A02: "rate_limited",
  P0A03: "suspended",
  P0A04: "rate_limited",
  P0A05: "rate_limited",
  P0A06: "rate_limited",
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
