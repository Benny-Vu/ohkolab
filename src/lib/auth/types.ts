import type { Session, User } from "@supabase/supabase-js";

export type { Session, User };

/** OAuth sign-in methods the app offers. */
export type OAuthProvider = "google" | "discord";

export const OAUTH_PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  discord: "Discord",
};

/** A user's public profile (a row of `public.profiles`, in camelCase). */
export interface Profile {
  /** Same id as the auth user. */
  id: string;
  username: string;
  displayName: string | null;
  /** Species name from the Champions roster, or null for no avatar. */
  avatarSpecies: string | null;
  bio: string | null;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}

/** Fields a user may change on their own profile. Omitted fields are kept. */
export interface ProfileChanges {
  username?: string;
  displayName?: string | null;
  avatarSpecies?: string | null;
  bio?: string | null;
}

export type AuthErrorCode =
  /** Supabase settings are missing; the app runs in guest mode. */
  | "not_configured"
  /** The backend exists but is not ready (e.g. migrations not applied). */
  | "unavailable"
  | "invalid_input"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "email_taken"
  | "weak_password"
  | "rate_limited"
  | "provider_unavailable"
  | "username_taken"
  | "session_expired"
  | "link_invalid"
  | "forbidden"
  | "network"
  | "unknown";

/** Why an action failed, with a message that can be shown to the user as is. */
export interface AuthFailure {
  code: AuthErrorCode;
  message: string;
  /** For `invalid_input`: the form field at fault, when there is one. */
  field?: string;
}

/** What every auth action resolves to. Actions never throw. */
export type AuthResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: AuthFailure };

export interface SignUpInput {
  email: string;
  password: string;
  /** The "I am 13 or older and accept the terms" box. Sign-up fails without it. */
  acceptedTerms: boolean;
}

export interface SignUpOutcome {
  /** True when the user must open the emailed link before they are signed in. */
  needsEmailConfirmation: boolean;
}

export interface RedirectOutcome {
  /** In-app path to send the user to now that the redirect is finished. */
  returnTo: string;
}

/** What `useAuth()` returns. */
export interface AuthContextValue {
  /** False in guest mode (no Supabase settings): every action fails with `not_configured`. */
  isConfigured: boolean;
  /**
   * True until the stored session has been read and, for a signed-in user,
   * their profile has been fetched. While true, `user` and `profile` may
   * still change from null.
   */
  loading: boolean;
  session: Session | null;
  /** The signed-in user, or null for a guest. */
  user: User | null;
  /**
   * The signed-in user's profile. Null for a guest, and also when it could not
   * be loaded (call `refreshProfile()` to retry).
   */
  profile: Profile | null;

  signInWithPassword(email: string, password: string): Promise<AuthResult>;
  signUp(input: SignUpInput): Promise<AuthResult<SignUpOutcome>>;
  /**
   * Starts Google or Discord sign-in. On success the browser leaves the app
   * and comes back to `/auth/callback`, then to `returnTo`.
   */
  signInWithProvider(
    provider: OAuthProvider,
    returnTo?: string,
  ): Promise<AuthResult>;
  /** Signs out on this device only. */
  signOut(): Promise<AuthResult>;
  /** Emails a link that leads to `/reset-password`. */
  requestPasswordReset(email: string): Promise<AuthResult>;
  /** Sets a new password for the signed-in user. */
  updatePassword(newPassword: string): Promise<AuthResult>;

  /** Saves changes to the signed-in user's profile and updates `profile`. */
  updateProfile(changes: ProfileChanges): Promise<AuthResult<Profile>>;
  /** Fetches the signed-in user's profile again. */
  refreshProfile(): Promise<void>;
  /** Permanently deletes the signed-in user's account and all their data. */
  deleteAccount(): Promise<AuthResult>;
  /**
   * Finishes an OAuth, email-confirmation or password-reset redirect from its
   * full URL. Used by the `/auth/callback` page (and later by the mobile
   * apps' deep-link handler).
   */
  completeAuthRedirect(url: string): Promise<AuthResult<RedirectOutcome>>;
}
