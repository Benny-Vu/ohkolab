import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthActions, toProfile } from "@/lib/auth/auth-actions";
import {
  consumeReturnTo,
  getAuthCallbackUrl,
  rememberReturnTo,
} from "@/lib/auth/redirects";
import type { AuthErrorCode, AuthResult } from "@/lib/auth/types";
import type { ProfileRow } from "@/lib/database.types";
import type { AppSupabaseClient } from "@/lib/supabase";

const PROFILE_ROW: ProfileRow = {
  id: "user-1",
  username: "ash",
  display_name: "Ash Ketchum",
  avatar_species: "Pikachu",
  bio: "Champion of Kanto.",
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-02T00:00:00.000Z",
};

const EXPECTED_PROFILE = {
  id: "user-1",
  username: "ash",
  displayName: "Ash Ketchum",
  avatarSpecies: "Pikachu",
  bio: "Champion of Kanto.",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
};

const ORIGIN = window.location.origin;
const CALLBACK = `${ORIGIN}/auth/callback`;

/** A Supabase client stand-in: every method is a mock, no call leaves the test. */
function createFakeClient() {
  const auth = {
    signInWithPassword: vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: { identities: [{}] }, session: { user: { id: "user-1" } } },
      error: null,
    }),
    signInWithOAuth: vi.fn().mockResolvedValue({
      data: { url: "https://auth.example.com" },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi
      .fn()
      .mockResolvedValue({ data: null, error: null }),
    updateUser: vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
    getSession: vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null }),
    exchangeCodeForSession: vi
      .fn()
      .mockResolvedValue({ data: { session: {}, user: {} }, error: null }),
    verifyOtp: vi
      .fn()
      .mockResolvedValue({ data: { session: {} }, error: null }),
  };

  const state: {
    profileRow: ProfileRow | null;
    profileError: unknown;
    updateRow: ProfileRow | null;
    updateError: unknown;
  } = {
    profileRow: null,
    profileError: null,
    updateRow: null,
    updateError: null,
  };

  const calls = {
    selectIds: [] as string[],
    updates: [] as Array<{ data: unknown; id: string }>,
  };

  const from = vi.fn((table: string) => {
    if (table !== "profiles") throw new Error(`unexpected table: ${table}`);
    return {
      select: () => ({
        eq: (_column: string, value: string) => {
          calls.selectIds.push(value);
          return {
            maybeSingle: async () => ({
              data: state.profileRow,
              error: state.profileError,
            }),
          };
        },
      }),
      update: (data: unknown) => {
        const record = { data, id: "" };
        calls.updates.push(record);
        return {
          eq: (_column: string, value: string) => {
            record.id = value;
            return {
              select: () => ({
                maybeSingle: async () => ({
                  data: state.updateRow,
                  error: state.updateError,
                }),
              }),
            };
          },
        };
      },
    };
  });

  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

  const client = { auth, from, rpc } as unknown as AppSupabaseClient;
  return { client, auth, from, rpc, state, calls };
}

function expectFailure(
  result: AuthResult<unknown>,
  code: AuthErrorCode,
  options: { field?: string; message?: string } = {},
): void {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe(code);
    if (options.message === undefined) {
      expect(result.error.message.length).toBeGreaterThan(0);
    } else {
      expect(result.error.message).toBe(options.message);
    }
    if (options.field === undefined) {
      expect(result.error.field).toBeUndefined();
    } else {
      expect(result.error.field).toBe(options.field);
    }
  }
}

beforeEach(() => {
  localStorage.clear();
});

describe("toProfile", () => {
  it("maps a database row to the camelCase profile shape", () => {
    expect(toProfile(PROFILE_ROW)).toEqual(EXPECTED_PROFILE);
  });
});

describe("createAuthActions without a client", () => {
  it("fails every action with not_configured", async () => {
    const actions = createAuthActions(null);

    expectFailure(
      await actions.signInWithPassword("ash@example.com", "password1"),
      "not_configured",
    );
    expectFailure(
      await actions.signUp({
        email: "ash@example.com",
        password: "password1",
        acceptedTerms: true,
      }),
      "not_configured",
    );
    expectFailure(await actions.signInWithProvider("google"), "not_configured");
    expectFailure(await actions.signOut(), "not_configured");
    expectFailure(
      await actions.requestPasswordReset("ash@example.com"),
      "not_configured",
    );
    expectFailure(await actions.updatePassword("password1"), "not_configured");
    expectFailure(await actions.fetchProfile("user-1"), "not_configured");
    expectFailure(await actions.updateProfile("user-1", {}), "not_configured");
    expectFailure(await actions.deleteAccount(), "not_configured");
    expectFailure(
      await actions.completeAuthRedirect(`${CALLBACK}?code=abc`),
      "not_configured",
    );
  });
});

describe("signInWithPassword", () => {
  it("signs in with the trimmed email", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    const result = await actions.signInWithPassword(
      "  ash@example.com  ",
      "password1",
    );

    expect(result).toEqual({ ok: true, data: undefined });
    expect(fake.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "ash@example.com",
      password: "password1",
    });
  });

  it("rejects an invalid email before calling the client", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.signInWithPassword("nope", "password1"),
      "invalid_input",
      {
        field: "email",
        message: "Enter a valid email address.",
      },
    );
    expect(fake.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects an empty password", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.signInWithPassword("ash@example.com", ""),
      "invalid_input",
      { field: "password", message: "Enter your password." },
    );
    expect(fake.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("maps wrong credentials to invalid_credentials", async () => {
    const fake = createFakeClient();
    fake.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "invalid_credentials" },
    });
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.signInWithPassword("ash@example.com", "password1"),
      "invalid_credentials",
    );
  });

  it("turns a thrown network error into a network failure", async () => {
    const fake = createFakeClient();
    fake.auth.signInWithPassword.mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.signInWithPassword("ash@example.com", "password1"),
      "network",
    );
  });
});

describe("signUp", () => {
  it("signs up and reports no email confirmation when a session comes back", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    const result = await actions.signUp({
      email: "new@example.com",
      password: "password1",
      acceptedTerms: true,
    });

    expect(result).toEqual({
      ok: true,
      data: { needsEmailConfirmation: false },
    });
  });

  it("reports email confirmation when there is no session", async () => {
    const fake = createFakeClient();
    fake.auth.signUp.mockResolvedValue({
      data: { user: { identities: [{}] }, session: null },
      error: null,
    });
    const actions = createAuthActions(fake.client);

    const result = await actions.signUp({
      email: "new@example.com",
      password: "password1",
      acceptedTerms: true,
    });

    expect(result).toEqual({
      ok: true,
      data: { needsEmailConfirmation: true },
    });
  });

  it("treats a user without identities as a taken email", async () => {
    const fake = createFakeClient();
    fake.auth.signUp.mockResolvedValue({
      data: { user: { identities: [] }, session: null },
      error: null,
    });
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.signUp({
        email: "taken@example.com",
        password: "password1",
        acceptedTerms: true,
      }),
      "email_taken",
    );
  });

  it("requires the terms checkbox", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.signUp({
        email: "new@example.com",
        password: "password1",
        acceptedTerms: false,
      }),
      "invalid_input",
      {
        field: "acceptedTerms",
        message:
          "Confirm that you are 13 or older and accept the terms to create an account.",
      },
    );
    expect(fake.auth.signUp).not.toHaveBeenCalled();
    expect(consumeReturnTo()).toBe("/");
  });

  it("validates the email and the password", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.signUp({
        email: "nope",
        password: "password1",
        acceptedTerms: true,
      }),
      "invalid_input",
      { field: "email", message: "Enter a valid email address." },
    );
    expectFailure(
      await actions.signUp({
        email: "new@example.com",
        password: "short",
        acceptedTerms: true,
      }),
      "invalid_input",
      { field: "password", message: "Password must be at least 8 characters." },
    );
    expect(fake.auth.signUp).not.toHaveBeenCalled();
  });

  it("sends the confirmation link to the callback URL and records the terms", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    await actions.signUp({
      email: "new@example.com",
      password: "password1",
      acceptedTerms: true,
    });

    expect(fake.auth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password1",
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        data: {
          age_13_or_older: true,
          terms_accepted_at: expect.any(String),
        },
      },
    });
  });

  it("remembers a safe return destination", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    await actions.signUp({
      email: "new@example.com",
      password: "password1",
      acceptedTerms: true,
      returnTo: "/teams?tab=1",
    });
    expect(consumeReturnTo()).toBe("/teams?tab=1");

    await actions.signUp({
      email: "new@example.com",
      password: "password1",
      acceptedTerms: true,
      returnTo: "/login",
    });
    expect(consumeReturnTo()).toBe("/");
  });

  it("maps sign-up errors", async () => {
    const fake = createFakeClient();
    fake.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "user_already_exists" },
    });
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.signUp({
        email: "taken@example.com",
        password: "password1",
        acceptedTerms: true,
      }),
      "email_taken",
    );

    fake.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "weak_password" },
    });
    expectFailure(
      await actions.signUp({
        email: "new@example.com",
        password: "password1",
        acceptedTerms: true,
      }),
      "weak_password",
    );
  });
});

describe("signInWithProvider", () => {
  it("starts OAuth sign-in and remembers where to return", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    const result = await actions.signInWithProvider("google", "/teams");

    expect(result).toEqual({ ok: true, data: undefined });
    expect(fake.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: getAuthCallbackUrl() },
    });
    expect(consumeReturnTo()).toBe("/teams");
  });

  it("proceeds when the provider check says enabled", async () => {
    const fake = createFakeClient();
    const checkProvider = vi.fn().mockResolvedValue(true);
    const actions = createAuthActions(fake.client, { checkProvider });

    const result = await actions.signInWithProvider("discord");

    expect(result.ok).toBe(true);
    expect(checkProvider).toHaveBeenCalledWith("discord");
    expect(fake.auth.signInWithOAuth).toHaveBeenCalled();
  });

  it("proceeds when the provider check is unknown or throws", async () => {
    const fake = createFakeClient();
    const unknown = createAuthActions(fake.client, {
      checkProvider: vi.fn().mockResolvedValue(null),
    });
    expect((await unknown.signInWithProvider("google")).ok).toBe(true);

    const throwing = createAuthActions(fake.client, {
      checkProvider: vi.fn().mockRejectedValue(new Error("offline")),
    });
    expect((await throwing.signInWithProvider("google")).ok).toBe(true);
    expect(fake.auth.signInWithOAuth).toHaveBeenCalledTimes(2);
  });

  it("refuses a disabled provider with a friendly message", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client, {
      checkProvider: vi.fn().mockResolvedValue(false),
    });

    expectFailure(
      await actions.signInWithProvider("google"),
      "provider_unavailable",
      {
        message:
          "Google sign-in is not available yet. Use another way to sign in for now.",
      },
    );
    expectFailure(
      await actions.signInWithProvider("discord"),
      "provider_unavailable",
      {
        message:
          "Discord sign-in is not available yet. Use another way to sign in for now.",
      },
    );
    expect(fake.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("maps client errors", async () => {
    const fake = createFakeClient();
    fake.auth.signInWithOAuth.mockResolvedValue({
      data: null,
      error: { code: "provider_disabled" },
    });
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.signInWithProvider("google"),
      "provider_unavailable",
    );
  });
});

describe("signOut", () => {
  it("signs out on this device only", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    const result = await actions.signOut();

    expect(result).toEqual({ ok: true, data: undefined });
    expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("treats an expired session as signed out", async () => {
    const fake = createFakeClient();
    fake.auth.signOut.mockResolvedValue({
      error: { code: "session_not_found" },
    });
    const actions = createAuthActions(fake.client);

    expect((await actions.signOut()).ok).toBe(true);
  });

  it("reports other sign-out failures", async () => {
    const fake = createFakeClient();
    fake.auth.signOut.mockResolvedValue({ error: { code: "42501" } });
    const actions = createAuthActions(fake.client);

    expectFailure(await actions.signOut(), "forbidden");
  });
});

describe("requestPasswordReset", () => {
  it("emails a reset link and remembers the reset destination", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    const result = await actions.requestPasswordReset("  ash@example.com  ");

    expect(result).toEqual({ ok: true, data: undefined });
    expect(fake.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "ash@example.com",
      { redirectTo: getAuthCallbackUrl() },
    );
    expect(consumeReturnTo()).toBe("/reset-password");
  });

  it("validates the email", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(await actions.requestPasswordReset("nope"), "invalid_input", {
      field: "email",
      message: "Enter a valid email address.",
    });
    expect(fake.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("maps rate limits", async () => {
    const fake = createFakeClient();
    fake.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { code: "over_email_send_rate_limit" },
    });
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.requestPasswordReset("ash@example.com"),
      "rate_limited",
    );
  });
});

describe("updatePassword", () => {
  it("updates the password", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    const result = await actions.updatePassword("password1");

    expect(result).toEqual({ ok: true, data: undefined });
    expect(fake.auth.updateUser).toHaveBeenCalledWith({
      password: "password1",
    });
  });

  it("validates the new password", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(await actions.updatePassword(""), "invalid_input", {
      field: "password",
      message: "Choose a password.",
    });
    expectFailure(await actions.updatePassword("short"), "invalid_input", {
      field: "password",
      message: "Password must be at least 8 characters.",
    });
    expect(fake.auth.updateUser).not.toHaveBeenCalled();
  });

  it("maps weak-password errors", async () => {
    const fake = createFakeClient();
    fake.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: { code: "weak_password" },
    });
    const actions = createAuthActions(fake.client);

    expectFailure(await actions.updatePassword("password1"), "weak_password");
  });
});

describe("fetchProfile", () => {
  it("fetches and maps the profile", async () => {
    const fake = createFakeClient();
    fake.state.profileRow = PROFILE_ROW;
    const actions = createAuthActions(fake.client);

    const result = await actions.fetchProfile("user-1");

    expect(result).toEqual({ ok: true, data: EXPECTED_PROFILE });
    expect(fake.calls.selectIds).toEqual(["user-1"]);
  });

  it("resolves with null when there is no profile row", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expect(await actions.fetchProfile("user-1")).toEqual({
      ok: true,
      data: null,
    });
  });

  it("maps database errors", async () => {
    const fake = createFakeClient();
    fake.state.profileError = { code: "PGRST205" };
    const actions = createAuthActions(fake.client);

    expectFailure(await actions.fetchProfile("user-1"), "unavailable");
  });
});

describe("updateProfile", () => {
  it("saves normalized changes and returns the updated profile", async () => {
    const fake = createFakeClient();
    fake.state.updateRow = PROFILE_ROW;
    const actions = createAuthActions(fake.client);

    const result = await actions.updateProfile("user-1", {
      username: "  Ash  ",
      displayName: "   ",
      bio: "Hello!",
    });

    expect(result).toEqual({ ok: true, data: EXPECTED_PROFILE });
    expect(fake.calls.updates).toEqual([
      {
        data: { username: "ash", display_name: null, bio: "Hello!" },
        id: "user-1",
      },
    ]);
  });

  it("validates each field with its own error", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.updateProfile("user-1", { username: "a" }),
      "invalid_input",
      { field: "username", message: "Username must be at least 3 characters." },
    );
    expectFailure(
      await actions.updateProfile("user-1", { displayName: "x".repeat(41) }),
      "invalid_input",
      { field: "displayName" },
    );
    expectFailure(
      await actions.updateProfile("user-1", { bio: "x".repeat(301) }),
      "invalid_input",
      { field: "bio" },
    );
    expectFailure(
      await actions.updateProfile("user-1", { avatarSpecies: "x".repeat(61) }),
      "invalid_input",
      {
        field: "avatarSpecies",
        message: "That Pokémon cannot be used as an avatar.",
      },
    );
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("falls back to fetching when nothing changes", async () => {
    const fake = createFakeClient();
    fake.state.profileRow = PROFILE_ROW;
    const actions = createAuthActions(fake.client);

    const result = await actions.updateProfile("user-1", {});

    expect(result).toEqual({ ok: true, data: EXPECTED_PROFILE });
    expect(fake.calls.updates).toEqual([]);
  });

  it("fails with unavailable when there is no profile to read back", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(await actions.updateProfile("user-1", {}), "unavailable");
  });

  it("flags a taken username on the username field", async () => {
    const fake = createFakeClient();
    fake.state.updateError = { code: "23505" };
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.updateProfile("user-1", { username: "ash" }),
      "username_taken",
      { field: "username" },
    );
  });

  it("fails with unavailable when the update matches no row", async () => {
    const fake = createFakeClient();
    fake.state.updateRow = null;
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.updateProfile("user-1", { bio: "Hello!" }),
      "unavailable",
    );
  });

  it("maps other database errors", async () => {
    const fake = createFakeClient();
    fake.state.updateError = { code: "42501" };
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.updateProfile("user-1", { bio: "Hello!" }),
      "forbidden",
    );
  });
});

describe("deleteAccount", () => {
  it("deletes the account and clears the local session", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    const result = await actions.deleteAccount();

    expect(result).toEqual({ ok: true, data: undefined });
    expect(fake.rpc).toHaveBeenCalledWith("delete_own_account");
    expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("reports failures from the delete call", async () => {
    const fake = createFakeClient();
    fake.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    const actions = createAuthActions(fake.client);

    expectFailure(await actions.deleteAccount(), "forbidden");
    expect(fake.auth.signOut).not.toHaveBeenCalled();
  });

  it("still succeeds when the local sign-out fails", async () => {
    const fake = createFakeClient();
    fake.auth.signOut.mockRejectedValue(new Error("offline"));
    const actions = createAuthActions(fake.client);

    expect((await actions.deleteAccount()).ok).toBe(true);
  });
});

describe("completeAuthRedirect", () => {
  it("exchanges a one-time code and returns the remembered destination", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);
    rememberReturnTo("/teams");

    const result = await actions.completeAuthRedirect(`${CALLBACK}?code=abc`);

    expect(result).toEqual({ ok: true, data: { returnTo: "/teams" } });
    expect(fake.auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
  });

  it("sends recovery redirects to the reset-password page", async () => {
    const fake = createFakeClient();
    fake.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: {}, user: {}, redirectType: "recovery" },
      error: null,
    });
    const actions = createAuthActions(fake.client);
    rememberReturnTo("/teams");

    const result = await actions.completeAuthRedirect(`${CALLBACK}?code=abc`);

    expect(result).toEqual({ ok: true, data: { returnTo: "/reset-password" } });
  });

  it("uses a one-time code only once per URL", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);
    const url = `${CALLBACK}?code=abc`;

    const first = await actions.completeAuthRedirect(url);
    const second = await actions.completeAuthRedirect(url);

    expect(first).toEqual(second);
    expect(fake.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it("shares the in-flight exchange with concurrent calls", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);
    const url = `${CALLBACK}?code=abc`;

    const [first, second] = await Promise.all([
      actions.completeAuthRedirect(url),
      actions.completeAuthRedirect(url),
    ]);

    expect(first).toEqual(second);
    expect(fake.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it("exchanges different codes separately", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    await actions.completeAuthRedirect(`${CALLBACK}?code=one`);
    await actions.completeAuthRedirect(`${CALLBACK}?code=two`);

    expect(fake.auth.exchangeCodeForSession).toHaveBeenCalledTimes(2);
  });

  it("does not dedupe URLs without a one-time token", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    await actions.completeAuthRedirect(CALLBACK);
    await actions.completeAuthRedirect(CALLBACK);

    expect(fake.auth.getSession).toHaveBeenCalledTimes(2);
  });

  it("reports a refused sign-in as forbidden", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.completeAuthRedirect(
        `${CALLBACK}?error=access_denied&error_description=Nope`,
      ),
      "forbidden",
      { message: "Sign-in was cancelled or refused. Try again." },
    );
    expect(fake.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("reports other URL errors as unknown failures", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.completeAuthRedirect(`${CALLBACK}?error=server_error`),
      "unknown",
      { message: "Sign-in could not be completed. Try again." },
    );
  });

  it("maps error_code from the URL", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.completeAuthRedirect(`${CALLBACK}?error_code=otp_expired`),
      "link_invalid",
    );
  });

  it("reads errors from the URL fragment too", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.completeAuthRedirect(`${CALLBACK}#error=access_denied`),
      "forbidden",
    );
  });

  it("verifies an email token hash and honours its type", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    const result = await actions.completeAuthRedirect(
      `${CALLBACK}?token_hash=th&type=recovery`,
    );

    expect(result).toEqual({ ok: true, data: { returnTo: "/reset-password" } });
    expect(fake.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "th",
      type: "recovery",
    });
  });

  it("returns the remembered destination for non-recovery token links", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);
    rememberReturnTo("/teams");

    const result = await actions.completeAuthRedirect(
      `${CALLBACK}?token_hash=th&type=signup`,
    );

    expect(result).toEqual({ ok: true, data: { returnTo: "/teams" } });
  });

  it("treats a failed code exchange as an invalid link", async () => {
    const fake = createFakeClient();
    fake.auth.exchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { code: "otp_expired" },
    });
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.completeAuthRedirect(`${CALLBACK}?code=abc`),
      "link_invalid",
    );
  });

  it("keeps network and rate-limit failures as they are", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    fake.auth.exchangeCodeForSession.mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    expectFailure(
      await actions.completeAuthRedirect(`${CALLBACK}?code=abc`),
      "network",
    );

    fake.auth.exchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { code: "over_request_rate_limit" },
    });
    expectFailure(
      await actions.completeAuthRedirect(`${CALLBACK}?code=other`),
      "rate_limited",
    );
  });

  it("returns the remembered destination when already signed in", async () => {
    const fake = createFakeClient();
    fake.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    const actions = createAuthActions(fake.client);
    rememberReturnTo("/teams");

    const result = await actions.completeAuthRedirect(CALLBACK);

    expect(result).toEqual({ ok: true, data: { returnTo: "/teams" } });
  });

  it("fails with link_invalid when there is nothing to finish and no session", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(await actions.completeAuthRedirect(CALLBACK), "link_invalid");
  });

  it("fails with link_invalid for a malformed URL", async () => {
    const fake = createFakeClient();
    const actions = createAuthActions(fake.client);

    expectFailure(
      await actions.completeAuthRedirect("not a url"),
      "link_invalid",
    );
  });
});
