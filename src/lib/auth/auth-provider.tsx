import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  createAuthActions,
  type AuthActionsOptions,
} from "@/lib/auth/auth-actions";
import { fail } from "@/lib/auth/errors";
import { createProviderCheck } from "@/lib/auth/provider-status";
import type { AuthContextValue, Profile, Session } from "@/lib/auth/types";
import { AuthContext } from "@/lib/auth/use-auth";
import {
  supabase,
  supabaseConfig,
  type AppSupabaseClient,
} from "@/lib/supabase";

const defaultCheckProvider = createProviderCheck(supabaseConfig);

interface AuthProviderProps {
  /**
   * The Supabase client to use. Defaults to the app's shared client, which is
   * null in guest mode. Tests pass a fake client, or null.
   */
  client?: AppSupabaseClient | null;
  /** See `AuthActionsOptions.checkProvider`. Defaults to the project's settings. */
  checkProvider?: AuthActionsOptions["checkProvider"];
  children: ReactNode;
}

interface SessionState {
  /** False until the stored session has been read. */
  known: boolean;
  session: Session | null;
}

interface ProfileState {
  /** The user this profile was fetched for. */
  userId: string;
  profile: Profile | null;
}

/**
 * Keeps the session and the signed-in user's profile in step with Supabase
 * and provides them, with the auth actions, through `useAuth()`.
 */
export function AuthProvider({
  client = supabase,
  checkProvider = defaultCheckProvider,
  children,
}: AuthProviderProps) {
  const actions = useMemo(
    () => createAuthActions(client, { checkProvider }),
    [client, checkProvider],
  );

  const [sessionState, setSessionState] = useState<SessionState>({
    known: client === null,
    session: null,
  });
  const [profileState, setProfileState] = useState<ProfileState | null>(null);

  // Supabase reports the stored session first (INITIAL_SESSION), then every
  // sign-in, sign-out and token refresh, including those from other tabs.
  useEffect(() => {
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setSessionState({ known: true, session });
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  const session = sessionState.session;
  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let current = true;
    void actions.fetchProfile(userId).then((result) => {
      if (current) {
        setProfileState({ userId, profile: result.ok ? result.data : null });
      }
    });
    return () => {
      current = false;
    };
  }, [actions, userId]);

  // A profile fetched for another user (after switching accounts) is ignored.
  const profileKnown = userId !== null && profileState?.userId === userId;
  const profile = profileKnown ? profileState.profile : null;
  const loading = !sessionState.known || (userId !== null && !profileKnown);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const result = await actions.fetchProfile(userId);
    setProfileState({ userId, profile: result.ok ? result.data : null });
  }, [actions, userId]);

  const updateProfile = useCallback<AuthContextValue["updateProfile"]>(
    async (changes) => {
      if (!userId) return fail("session_expired");
      const result = await actions.updateProfile(userId, changes);
      if (result.ok) setProfileState({ userId, profile: result.data });
      return result;
    },
    [actions, userId],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: client !== null,
      loading,
      session,
      user,
      profile,
      signInWithPassword: actions.signInWithPassword,
      signUp: actions.signUp,
      signInWithProvider: actions.signInWithProvider,
      signOut: actions.signOut,
      requestPasswordReset: actions.requestPasswordReset,
      updatePassword: actions.updatePassword,
      updateProfile,
      refreshProfile,
      deleteAccount: actions.deleteAccount,
      completeAuthRedirect: actions.completeAuthRedirect,
    }),
    [
      client,
      loading,
      session,
      user,
      profile,
      actions,
      updateProfile,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
