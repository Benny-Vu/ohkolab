import { describe, expect, it } from "vitest";

import {
  describeError,
  fail,
  failure,
  notConfigured,
  succeed,
} from "@/lib/auth/errors";
import { USERNAME_RULES } from "@/lib/auth/validation";

describe("failure, fail and succeed", () => {
  it("uses the default message for a code", () => {
    expect(failure("invalid_credentials")).toEqual({
      code: "invalid_credentials",
      message: "Wrong email or password.",
    });
  });

  it("carries a field only when there is one", () => {
    expect(failure("invalid_input", "Bad email.", "email")).toEqual({
      code: "invalid_input",
      message: "Bad email.",
      field: "email",
    });
    expect("field" in failure("invalid_input", "Bad email.")).toBe(false);
  });

  it("wraps failures and successes", () => {
    expect(fail("network")).toEqual({
      ok: false,
      error: {
        code: "network",
        message:
          "Could not reach the server. Check your connection and try again.",
      },
    });
    expect(fail("invalid_input", "Bad email.", "email")).toEqual({
      ok: false,
      error: { code: "invalid_input", message: "Bad email.", field: "email" },
    });
    expect(succeed()).toEqual({ ok: true, data: undefined });
    expect(succeed({ needsEmailConfirmation: true })).toEqual({
      ok: true,
      data: { needsEmailConfirmation: true },
    });
  });

  it("describes guest mode", () => {
    expect(notConfigured()).toEqual({
      ok: false,
      error: {
        code: "not_configured",
        message:
          "Accounts are not available in this build. The tools still work without one.",
      },
    });
  });
});

describe("describeError", () => {
  it("prefers the message overrides", () => {
    expect(describeError({ code: "same_password" })).toEqual({
      code: "invalid_input",
      message: "The new password must be different from the current one.",
    });
    expect(describeError({ code: "signup_disabled" })).toEqual({
      code: "invalid_input",
      message: "New sign-ups are closed right now.",
    });
    expect(describeError({ code: "reauthentication_needed" })).toEqual({
      code: "invalid_input",
      message:
        "For your security, sign out and sign in again before changing your password.",
    });
    expect(describeError({ code: "email_address_invalid" })).toEqual({
      code: "invalid_input",
      message: "That email address was not accepted. Check it for typos.",
    });
    expect(describeError({ code: "23514" })).toEqual({
      code: "invalid_input",
      message: `Those profile details were not accepted. Username: ${USERNAME_RULES}`,
    });
  });

  it("maps Supabase auth codes", () => {
    expect(describeError({ code: "invalid_credentials" }).code).toBe(
      "invalid_credentials",
    );
    expect(describeError({ code: "email_not_confirmed" }).code).toBe(
      "email_not_confirmed",
    );
    expect(describeError({ code: "user_already_exists" }).code).toBe(
      "email_taken",
    );
    expect(describeError({ code: "email_exists" }).code).toBe("email_taken");
    expect(describeError({ code: "weak_password" }).code).toBe("weak_password");
    expect(describeError({ code: "over_email_send_rate_limit" }).code).toBe(
      "rate_limited",
    );
    expect(describeError({ code: "over_request_rate_limit" }).code).toBe(
      "rate_limited",
    );
    expect(describeError({ code: "provider_disabled" }).code).toBe(
      "provider_unavailable",
    );
    expect(describeError({ code: "oauth_provider_not_supported" }).code).toBe(
      "provider_unavailable",
    );
    expect(describeError({ code: "email_provider_disabled" }).code).toBe(
      "provider_unavailable",
    );
    expect(describeError({ code: "session_not_found" }).code).toBe(
      "session_expired",
    );
    expect(describeError({ code: "session_expired" }).code).toBe(
      "session_expired",
    );
    expect(describeError({ code: "refresh_token_not_found" }).code).toBe(
      "session_expired",
    );
    expect(describeError({ code: "refresh_token_already_used" }).code).toBe(
      "session_expired",
    );
    expect(describeError({ code: "user_not_found" }).code).toBe(
      "session_expired",
    );
    expect(describeError({ code: "otp_expired" }).code).toBe("link_invalid");
    expect(describeError({ code: "flow_state_not_found" }).code).toBe(
      "link_invalid",
    );
    expect(describeError({ code: "flow_state_expired" }).code).toBe(
      "link_invalid",
    );
    expect(describeError({ code: "bad_code_verifier" }).code).toBe(
      "link_invalid",
    );
    expect(describeError({ code: "validation_failed" }).code).toBe(
      "invalid_input",
    );
  });

  it("maps Postgres and Data API codes", () => {
    expect(describeError({ code: "23505" }).code).toBe("username_taken");
    expect(describeError({ code: "42501" }).code).toBe("forbidden");
    expect(describeError({ code: "42P01" }).code).toBe("unavailable");
    expect(describeError({ code: "42883" }).code).toBe("unavailable");
    expect(describeError({ code: "PGRST202" }).code).toBe("unavailable");
    expect(describeError({ code: "PGRST205" }).code).toBe("unavailable");
  });

  it("maps error names", () => {
    expect(describeError({ name: "AuthRetryableFetchError" }).code).toBe(
      "network",
    );
    expect(describeError({ name: "AuthSessionMissingError" }).code).toBe(
      "session_expired",
    );
    expect(describeError({ name: "AuthWeakPasswordError" }).code).toBe(
      "weak_password",
    );
    expect(describeError({ name: "AuthPKCEGrantCodeExchangeError" }).code).toBe(
      "link_invalid",
    );
    expect(
      describeError({ name: "AuthPKCECodeVerifierMissingError" }).code,
    ).toBe("link_invalid");
  });

  it("maps a 429 status to rate limiting", () => {
    expect(describeError({ status: 429 }).code).toBe("rate_limited");
    expect(describeError({ status: 500 }).code).toBe("unknown");
  });

  it("recognizes network failures", () => {
    expect(describeError(new TypeError("Failed to fetch")).code).toBe(
      "network",
    );
    expect(describeError({ message: "Failed to fetch" }).code).toBe("network");
    expect(describeError({ message: "Network Error" }).code).toBe("network");
    expect(describeError({ message: "Network request failed" }).code).toBe(
      "network",
    );
    expect(describeError({ message: "Load failed" }).code).toBe("network");
  });

  it("falls back to unknown", () => {
    expect(describeError({ message: "something odd" })).toEqual({
      code: "unknown",
      message: "Something went wrong. Try again.",
    });
    expect(describeError("a string").code).toBe("unknown");
    expect(describeError(null).code).toBe("unknown");
  });

  it("prefers the code over the name and the status", () => {
    expect(
      describeError({
        code: "email_address_invalid",
        name: "AuthRetryableFetchError",
        status: 429,
      }).code,
    ).toBe("invalid_input");
    expect(
      describeError({ name: "AuthRetryableFetchError", status: 429 }).code,
    ).toBe("network");
  });
});
