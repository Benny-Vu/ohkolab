import type { ProfileRow, ProfileUpdate } from "@/lib/database.types";
import {
  describeError,
  fail,
  failure,
  notConfigured,
  succeed,
} from "@/lib/auth/errors";
import {
  consumeReturnTo,
  getAuthCallbackUrl,
  rememberReturnTo,
  RESET_PASSWORD_PATH,
  sanitizeReturnTo,
} from "@/lib/auth/redirects";
import {
  OAUTH_PROVIDER_LABELS,
  type AuthResult,
  type OAuthProvider,
  type Profile,
  type ProfileChanges,
  type RedirectOutcome,
  type SignUpInput,
  type SignUpOutcome,
} from "@/lib/auth/types";
import {
  normalizeEmail,
  normalizeOptionalText,
  normalizeUsername,
  validateAvatarSpecies,
  validateBio,
  validateCurrentPassword,
  validateDisplayName,
  validateEmail,
  validateLookingFor,
  validateNewPassword,
  validateProfileUrl,
  validateShowdownName,
  validateUsername,
} from "@/lib/auth/validation";
import type { AppSupabaseClient } from "@/lib/supabase";
import { isNativeApp } from "@/lib/platform";

/**
 * The auth logic, free of React: every call the app makes to Supabase for
 * accounts and profiles. `AuthProvider` wraps these; tests drive them with a
 * fake client. No action throws: each resolves to an `AuthResult`.
 */
export interface AuthActions {
  signInWithPassword(
    email: string,
    password: string,
    /** Turnstile token, when the form shows the widget. */
    captchaToken?: string,
  ): Promise<AuthResult>;
  signUp(
    input: SignUpInput & { returnTo?: string },
  ): Promise<AuthResult<SignUpOutcome>>;
  signInWithProvider(
    provider: OAuthProvider,
    returnTo?: string,
  ): Promise<AuthResult>;
  signOut(): Promise<AuthResult>;
  requestPasswordReset(
    email: string,
    /** Turnstile token, when the form shows the widget. */
    captchaToken?: string,
  ): Promise<AuthResult>;
  updatePassword(newPassword: string): Promise<AuthResult>;
  /** Resolves to null data when the user has no profile row. */
  fetchProfile(userId: string): Promise<AuthResult<Profile | null>>;
  updateProfile(
    userId: string,
    changes: ProfileChanges,
  ): Promise<AuthResult<Profile>>;
  deleteAccount(): Promise<AuthResult>;
  completeAuthRedirect(url: string): Promise<AuthResult<RedirectOutcome>>;
}

export interface AuthActionsOptions {
  /**
   * Tells whether an OAuth provider is switched on in the Supabase project:
   * true, false, or null when that cannot be known. Lets the app say "not
   * available yet" instead of sending the user to a raw error page.
   */
  checkProvider?: (provider: OAuthProvider) => Promise<boolean | null>;
  /**
   * Opens the OAuth provider's sign-in page outside the app (the native
   * build uses the system browser, because Google and Discord block
   * sign-in inside embedded WebViews). Injectable so tests can observe it.
   */
  openExternalAuthUrl?: (url: string) => Promise<void>;
}

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarSpecies: row.avatar_species,
    bio: row.bio,
    mainFormat: (row.main_format as Profile["mainFormat"]) ?? null,
    lookingFor: row.looking_for,
    youtubeUrl: row.youtube_url,
    twitchUrl: row.twitch_url,
    showdownName: row.showdown_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Runs an action and turns anything thrown (network errors) into a failure. */
async function attempt<T>(
  run: () => Promise<AuthResult<T>>,
): Promise<AuthResult<T>> {
  try {
    return await run();
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

/** Validates and normalizes profile changes into a database update. */
function toProfileUpdate(changes: ProfileChanges): AuthResult<ProfileUpdate> {
  const update: ProfileUpdate = {};

  if (changes.username !== undefined) {
    const username = normalizeUsername(changes.username);
    const error = validateUsername(username);
    if (error) return fail("invalid_input", error, "username");
    update.username = username;
  }
  if (changes.displayName !== undefined) {
    const displayName = normalizeOptionalText(changes.displayName);
    const error = validateDisplayName(displayName);
    if (error) return fail("invalid_input", error, "displayName");
    update.display_name = displayName;
  }
  if (changes.bio !== undefined) {
    const bio = normalizeOptionalText(changes.bio);
    const error = validateBio(bio);
    if (error) return fail("invalid_input", error, "bio");
    update.bio = bio;
  }
  if (changes.avatarSpecies !== undefined) {
    const avatarSpecies = normalizeOptionalText(changes.avatarSpecies);
    const error = validateAvatarSpecies(avatarSpecies);
    if (error) return fail("invalid_input", error, "avatarSpecies");
    update.avatar_species = avatarSpecies;
  }
  if (changes.mainFormat !== undefined) {
    update.main_format = changes.mainFormat;
  }
  if (changes.lookingFor !== undefined) {
    const lookingFor = normalizeOptionalText(changes.lookingFor);
    const error = validateLookingFor(lookingFor);
    if (error) return fail("invalid_input", error, "lookingFor");
    update.looking_for = lookingFor;
  }
  for (const [field, column] of [
    ["youtubeUrl", "youtube_url"],
    ["twitchUrl", "twitch_url"],
  ] as const) {
    if (changes[field] !== undefined) {
      const url = normalizeOptionalText(changes[field]);
      const error = validateProfileUrl(url);
      if (error) return fail("invalid_input", error, field);
      update[column] = url;
    }
  }
  if (changes.showdownName !== undefined) {
    const showdownName = normalizeOptionalText(changes.showdownName);
    const error = validateShowdownName(showdownName);
    if (error) return fail("invalid_input", error, "showdownName");
    update.showdown_name = showdownName;
  }
  return succeed(update);
}

/** A redirect that failed for any reason other than connectivity means a bad link. */
function redirectFailure(error: unknown): {
  ok: false;
  error: ReturnType<typeof failure>;
} {
  const described = describeError(error);
  return described.code === "network" || described.code === "rate_limited"
    ? { ok: false, error: described }
    : fail("link_invalid");
}

export function createAuthActions(
  client: AppSupabaseClient | null,
  options: AuthActionsOptions = {},
): AuthActions {
  if (!client) {
    const unavailable = () => Promise.resolve(notConfigured());
    return {
      signInWithPassword: unavailable,
      signUp: unavailable,
      signInWithProvider: unavailable,
      signOut: unavailable,
      requestPasswordReset: unavailable,
      updatePassword: unavailable,
      fetchProfile: unavailable,
      updateProfile: unavailable,
      deleteAccount: unavailable,
      completeAuthRedirect: unavailable,
    };
  }

  /** Redirects being finished, by URL: a one-time code must be used only once. */
  const redirects = new Map<string, Promise<AuthResult<RedirectOutcome>>>();

  const fetchProfile = async (
    userId: string,
  ): Promise<AuthResult<Profile | null>> => {
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) return { ok: false, error: describeError(error) };
    return succeed(data ? toProfile(data) : null);
  };

  const finishRedirect = async (
    url: string,
  ): Promise<AuthResult<RedirectOutcome>> => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return fail("link_invalid");
    }
    const query = parsed.searchParams;
    const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    const read = (name: string) => query.get(name) ?? fragment.get(name);

    // Supabase reports a failed or refused sign-in in the URL itself.
    const errorName = read("error");
    const errorCode = read("error_code");
    if (errorName || errorCode) {
      const described = describeError({ code: errorCode ?? undefined });
      if (described.code !== "unknown") return { ok: false, error: described };
      return errorName === "access_denied"
        ? fail("forbidden", "Sign-in was cancelled or refused. Try again.")
        : fail("unknown", "Sign-in could not be completed. Try again.");
    }

    // PKCE: OAuth, and email links with the default templates.
    const code = query.get("code");
    if (code) {
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (error) return redirectFailure(error);
      const redirectType = (data as { redirectType?: unknown }).redirectType;
      const remembered = consumeReturnTo();
      return succeed({
        returnTo:
          redirectType === "recovery" ? RESET_PASSWORD_PATH : remembered,
      });
    }

    // Email links built from `{{ .TokenHash }}`, which work on any device.
    const tokenHash = query.get("token_hash");
    const type = query.get("type");
    if (tokenHash && type) {
      const { error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (error) return redirectFailure(error);
      const remembered = consumeReturnTo();
      return succeed({
        returnTo: type === "recovery" ? RESET_PASSWORD_PATH : remembered,
      });
    }

    // Nothing to finish (a reload, a bookmark): fine if already signed in.
    const { data } = await client.auth.getSession();
    if (data.session) return succeed({ returnTo: consumeReturnTo() });
    return fail("link_invalid");
  };

  return {
    signInWithPassword: (email, password, captchaToken) =>
      attempt(async () => {
        const cleanEmail = normalizeEmail(email);
        const emailError = validateEmail(cleanEmail);
        if (emailError) return fail("invalid_input", emailError, "email");
        const passwordError = validateCurrentPassword(password);
        if (passwordError) {
          return fail("invalid_input", passwordError, "password");
        }

        const { error } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password,
          // Supabase verifies the token server-side once CAPTCHA is switched
          // on; without one there is nothing to check and sign-in is unchanged.
          ...(captchaToken ? { options: { captchaToken } } : {}),
        });
        return error ? { ok: false, error: describeError(error) } : succeed();
      }),

    signUp: ({ email, password, acceptedTerms, captchaToken, returnTo }) =>
      attempt(async () => {
        const cleanEmail = normalizeEmail(email);
        const emailError = validateEmail(cleanEmail);
        if (emailError) return fail("invalid_input", emailError, "email");
        const passwordError = validateNewPassword(password);
        if (passwordError) {
          return fail("invalid_input", passwordError, "password");
        }
        if (!acceptedTerms) {
          return fail(
            "invalid_input",
            "Confirm that you are 16 or older and accept the terms to create an account.",
            "acceptedTerms",
          );
        }

        // The confirmation link comes back through the callback page.
        rememberReturnTo(sanitizeReturnTo(returnTo));
        const { data, error } = await client.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: getAuthCallbackUrl(),
            ...(captchaToken ? { captchaToken } : {}),
            // A record of what the user confirmed, kept with their account.
            data: {
              age_13_or_older: true,
              terms_accepted_at: new Date().toISOString(),
            },
          },
        });
        if (error) return { ok: false, error: describeError(error) };
        // With email confirmation on, Supabase answers a sign-up for an
        // existing address with a user that has no identities, not an error.
        if (data.user?.identities && data.user.identities.length === 0) {
          return fail("email_taken");
        }
        return succeed({ needsEmailConfirmation: data.session === null });
      }),

    signInWithProvider: (provider, returnTo) =>
      attempt(async () => {
        const enabled = options.checkProvider
          ? await options.checkProvider(provider).catch(() => null)
          : null;
        if (enabled === false) {
          return fail(
            "provider_unavailable",
            `${OAUTH_PROVIDER_LABELS[provider]} sign-in is not available yet. Use another way to sign in for now.`,
          );
        }

        rememberReturnTo(sanitizeReturnTo(returnTo));
        if (isNativeApp()) {
          // The system browser handles the provider's sign-in pages and
          // comes back through the custom scheme; the appUrlOpen listener
          // in `@/lib/auth/native-auth` finishes the redirect.
          const { data, error } = await client.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: getAuthCallbackUrl(),
              skipBrowserRedirect: true,
            },
          });
          if (error) return { ok: false, error: describeError(error) };
          if (data.url) {
            const opened =
              options.openExternalAuthUrl ??
              (async (url: string) => {
                const { Browser } = await import("@capacitor/browser");
                await Browser.open({ url });
              });
            try {
              await opened(data.url);
            } catch {
              return fail("unknown", "Sign-in could not be opened. Try again.");
            }
          }
          return succeed();
        }
        const { error } = await client.auth.signInWithOAuth({
          provider,
          options: { redirectTo: getAuthCallbackUrl() },
        });
        return error ? { ok: false, error: describeError(error) } : succeed();
      }),

    signOut: () =>
      attempt(async () => {
        const { error } = await client.auth.signOut({ scope: "local" });
        if (!error) return succeed();
        const described = describeError(error);
        // Already signed out counts as signed out.
        return described.code === "session_expired"
          ? succeed()
          : { ok: false, error: described };
      }),

    requestPasswordReset: (email, captchaToken) =>
      attempt(async () => {
        const cleanEmail = normalizeEmail(email);
        const emailError = validateEmail(cleanEmail);
        if (emailError) return fail("invalid_input", emailError, "email");

        rememberReturnTo(RESET_PASSWORD_PATH);
        const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: getAuthCallbackUrl(),
          ...(captchaToken ? { captchaToken } : {}),
        });
        return error ? { ok: false, error: describeError(error) } : succeed();
      }),

    updatePassword: (newPassword) =>
      attempt(async () => {
        const passwordError = validateNewPassword(newPassword);
        if (passwordError) {
          return fail("invalid_input", passwordError, "password");
        }
        const { error } = await client.auth.updateUser({
          password: newPassword,
        });
        return error ? { ok: false, error: describeError(error) } : succeed();
      }),

    fetchProfile: (userId) => attempt(() => fetchProfile(userId)),

    updateProfile: (userId, changes) =>
      attempt(async () => {
        const update = toProfileUpdate(changes);
        if (!update.ok) return update;

        if (Object.keys(update.data).length === 0) {
          const current = await fetchProfile(userId);
          if (!current.ok) return current;
          return current.data ? succeed(current.data) : fail("unavailable");
        }

        const { data, error } = await client
          .from("profiles")
          .update(update.data)
          .eq("id", userId)
          .select("*")
          .maybeSingle();
        if (error) {
          const described = describeError(error);
          return {
            ok: false,
            error:
              described.code === "username_taken"
                ? { ...described, field: "username" }
                : described,
          };
        }
        // No row back means there is no profile to update (or it is not ours).
        return data ? succeed(toProfile(data)) : fail("unavailable");
      }),

    deleteAccount: () =>
      attempt(async () => {
        const { error } = await client.rpc("delete_own_account");
        if (error) return { ok: false, error: describeError(error) };
        // The account is gone, so the server has nothing left to sign out of:
        // this only clears the session kept on this device.
        try {
          await client.auth.signOut({ scope: "local" });
        } catch {
          // The local session is cleared even when the server call fails.
        }
        return succeed();
      }),

    completeAuthRedirect: (url) => {
      const hasOneTimeToken = /[?&](code|token_hash)=/.test(url);
      if (!hasOneTimeToken) return attempt(() => finishRedirect(url));
      let pending = redirects.get(url);
      if (!pending) {
        pending = attempt(() => finishRedirect(url));
        redirects.set(url, pending);
      }
      return pending;
    },
  };
}
