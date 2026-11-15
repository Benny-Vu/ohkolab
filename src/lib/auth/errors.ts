import type { AuthErrorCode, AuthFailure, AuthResult } from "@/lib/auth/types";
import { USERNAME_RULES } from "@/lib/auth/validation";

/** Messages shown to the user. One place, so the wording stays consistent. */
const MESSAGES: Record<AuthErrorCode, string> = {
  not_configured:
    "Accounts are not available in this build. The tools still work without one.",
  unavailable: "Accounts are not fully set up yet. Try again later.",
  invalid_input:
    "Some of those details were not accepted. Check them and try again.",
  invalid_credentials: "Wrong email or password.",
  email_not_confirmed:
    "Confirm your email address first: open the link we sent you, then sign in.",
  email_taken:
    "An account with this email may already exist. Try signing in, or reset your password.",
  weak_password: "That password is too easy to guess. Choose a stronger one.",
  rate_limited: "Too many attempts. Wait a minute and try again.",
  provider_unavailable: "This sign-in method is not available yet.",
  username_taken: "That username is already taken. Try another one.",
  session_expired: "Your session has expired. Sign in again.",
  link_invalid:
    "This link is no longer valid. It may have expired, been used already, or been opened in a different browser from the one you started in. Request a new one.",
  forbidden: "You are not allowed to do that.",
  network: "Could not reach the server. Check your connection and try again.",
  unknown: "Something went wrong. Try again.",
};

export function failure(
  code: AuthErrorCode,
  message: string = MESSAGES[code],
  field?: string,
): AuthFailure {
  return field ? { code, message, field } : { code, message };
}

export function fail(
  code: AuthErrorCode,
  message?: string,
  field?: string,
): { ok: false; error: AuthFailure } {
  return { ok: false, error: failure(code, message, field) };
}

export function succeed(): AuthResult;
export function succeed<T>(data: T): AuthResult<T>;
export function succeed<T>(data?: T): AuthResult<T | undefined> {
  return { ok: true, data };
}

/** Error codes from Supabase Auth and from Postgres, mapped to ours. */
const CODE_MAP: Record<string, AuthErrorCode> = {
  // Supabase Auth
  invalid_credentials: "invalid_credentials",
  email_not_confirmed: "email_not_confirmed",
  user_already_exists: "email_taken",
  email_exists: "email_taken",
  weak_password: "weak_password",
  over_email_send_rate_limit: "rate_limited",
  over_request_rate_limit: "rate_limited",
  provider_disabled: "provider_unavailable",
  oauth_provider_not_supported: "provider_unavailable",
  email_provider_disabled: "provider_unavailable",
  session_not_found: "session_expired",
  session_expired: "session_expired",
  refresh_token_not_found: "session_expired",
  refresh_token_already_used: "session_expired",
  user_not_found: "session_expired",
  otp_expired: "link_invalid",
  flow_state_not_found: "link_invalid",
  flow_state_expired: "link_invalid",
  bad_code_verifier: "link_invalid",
  email_address_invalid: "invalid_input",
  validation_failed: "invalid_input",
  // Postgres, through the Data API
  "23505": "username_taken", // unique_violation: the only unique profile field a user can set
  "23514": "invalid_input", // check_violation
  "42501": "forbidden", // insufficient_privilege (also raised by row level security)
  "42P01": "unavailable", // undefined_table: migrations not applied
  "42883": "unavailable", // undefined_function: migrations not applied
  PGRST202: "unavailable", // function not in the schema cache
  PGRST205: "unavailable", // table not in the schema cache
};

/** Messages that differ from the default for their code. */
const MESSAGE_OVERRIDES: Record<string, string> = {
  same_password: "The new password must be different from the current one.",
  signup_disabled: "New sign-ups are closed right now.",
  reauthentication_needed:
    "For your security, sign out and sign in again before changing your password.",
  email_address_invalid:
    "That email address was not accepted. Check it for typos.",
  "23514": `Those profile details were not accepted. Username: ${USERNAME_RULES}`,
};

const NAME_MAP: Record<string, AuthErrorCode> = {
  AuthRetryableFetchError: "network",
  AuthSessionMissingError: "session_expired",
  AuthWeakPasswordError: "weak_password",
  AuthPKCEGrantCodeExchangeError: "link_invalid",
  AuthPKCECodeVerifierMissingError: "link_invalid",
};

function readString(source: unknown, key: string): string | undefined {
  if (typeof source !== "object" || source === null) return undefined;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function readStatus(source: unknown): number | undefined {
  if (typeof source !== "object" || source === null) return undefined;
  const value = (source as Record<string, unknown>).status;
  return typeof value === "number" ? value : undefined;
}

/**
 * Turns anything a Supabase call can produce (auth errors, Data API errors,
 * thrown network errors) into a failure with a friendly message. The raw
 * message is never shown: it is written for developers and can leak details.
 */
export function describeError(error: unknown): AuthFailure {
  const code = readString(error, "code");
  const name = readString(error, "name");
  const message = readString(error, "message") ?? "";

  if (code && code in MESSAGE_OVERRIDES) {
    return failure(CODE_MAP[code] ?? "invalid_input", MESSAGE_OVERRIDES[code]);
  }
  if (code && code in CODE_MAP) return failure(CODE_MAP[code] ?? "unknown");
  if (name && name in NAME_MAP) return failure(NAME_MAP[name] ?? "unknown");
  if (readStatus(error) === 429) return failure("rate_limited");
  if (
    error instanceof TypeError ||
    /failed to fetch|network ?(error|request)|load failed/i.test(message)
  ) {
    return failure("network");
  }
  return failure("unknown");
}

/** The failure every action returns in guest mode. */
export function notConfigured(): { ok: false; error: AuthFailure } {
  return fail("not_configured");
}
