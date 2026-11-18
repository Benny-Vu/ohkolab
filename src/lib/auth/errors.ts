import type { AuthErrorCode, AuthFailure, AuthResult } from "@/lib/auth/types";
import { usernameRules } from "@/lib/auth/validation";
import { t } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";

/** Messages shown to the user. One place, so the wording stays consistent. */
const MESSAGES: Record<AuthErrorCode, TranslationKey> = {
  not_configured: "auth.errNotConfigured",
  unavailable: "auth.errUnavailable",
  invalid_input: "auth.errInvalidInput",
  invalid_credentials: "auth.errInvalidCredentials",
  email_not_confirmed: "auth.errEmailNotConfirmed",
  email_taken: "auth.errEmailTaken",
  weak_password: "auth.errWeakPassword",
  rate_limited: "auth.errRateLimited",
  provider_unavailable: "auth.errProviderUnavailable",
  username_taken: "auth.errUsernameTaken",
  session_expired: "auth.errSessionExpired",
  link_invalid: "auth.errLinkInvalid",
  forbidden: "auth.errForbidden",
  network: "auth.errNetwork",
  unknown: "auth.errUnknown",
};

export function failure(
  code: AuthErrorCode,
  message: string = t(MESSAGES[code]),
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
const MESSAGE_OVERRIDES: Record<string, () => string> = {
  same_password: () => t("auth.errSamePassword"),
  signup_disabled: () => t("auth.errSignupDisabled"),
  reauthentication_needed: () => t("auth.errReauth"),
  email_address_invalid: () => t("auth.errEmailAddressInvalid"),
  "23514": () => t("auth.errProfileRejected", { rules: usernameRules() }),
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
    return failure(
      CODE_MAP[code] ?? "invalid_input",
      MESSAGE_OVERRIDES[code](),
    );
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
