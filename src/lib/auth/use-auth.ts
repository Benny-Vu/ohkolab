import { createContext, useContext } from "react";

import { createAuthActions } from "@/lib/auth/auth-actions";
import type { AuthContextValue } from "@/lib/auth/types";

const guestActions = createAuthActions(null);

/**
 * What `useAuth()` returns outside an `AuthProvider`: the same guest state as
 * an app without Supabase settings. It lets a component that reads `useAuth()`
 * render in an isolated test without any wrapper.
 */
export const GUEST_AUTH: AuthContextValue = {
  isConfigured: false,
  loading: false,
  session: null,
  user: null,
  profile: null,
  signInWithPassword: guestActions.signInWithPassword,
  signUp: guestActions.signUp,
  signInWithProvider: guestActions.signInWithProvider,
  signOut: guestActions.signOut,
  requestPasswordReset: guestActions.requestPasswordReset,
  updatePassword: guestActions.updatePassword,
  updateProfile: () => guestActions.updateProfile("", {}),
  refreshProfile: () => Promise.resolve(),
  deleteAccount: guestActions.deleteAccount,
  completeAuthRedirect: guestActions.completeAuthRedirect,
};

export const AuthContext = createContext<AuthContextValue>(GUEST_AUTH);

/**
 * The current account state and the actions that change it.
 *
 * ```tsx
 * const { user, profile, loading, isConfigured } = useAuth();
 * if (loading) return <Skeleton />;
 * if (!user) return <SignInPrompt />; // guests keep using the tools
 * ```
 *
 * - `user` is null for a guest. `profile` holds the username, display name,
 *   avatar species and bio of the signed-in user.
 * - Actions resolve to `{ ok: true, data }` or `{ ok: false, error }` and
 *   never throw; `error.message` is ready to show to the user.
 * - When `isConfigured` is false the app has no backend (tests, a fresh
 *   clone): `user` stays null and every action fails with `not_configured`.
 */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
