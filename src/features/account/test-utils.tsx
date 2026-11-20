import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { afterEach } from "vitest";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import type {
  AuthContextValue,
  AuthErrorCode,
  Profile,
  Session,
  User,
} from "@/lib/auth/types";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

export const TEST_PROFILE: Profile = {
  id: "user-1",
  username: "ashketchum",
  displayName: "Ash",
  avatarSpecies: "Pikachu",
  bio: "Pallet Town",
  favouriteSpecies: null,
  mainFormat: null,
  lookingFor: null,
  youtubeUrl: null,
  twitchUrl: null,
  showdownName: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const TEST_USER = {
  id: "user-1",
  email: "ash@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
} as unknown as User;

const TEST_SESSION = {
  access_token: "token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 9999999999,
  refresh_token: "refresh",
  user: TEST_USER,
} as unknown as Session;

export type FakeAuth = AuthContextValue & {
  calls: { name: string; args: unknown[] }[];
};

type FakeFailure = { code: AuthErrorCode; message: string; field?: string };

/**
 * A fake `useAuth()` value: every action records its call and resolves with
 * `ok` (or the failure from `failures[name]`). No network involved.
 */
export function createFakeAuth(
  overrides: Partial<AuthContextValue> = {},
  failures: Record<string, FakeFailure> = {},
): FakeAuth {
  const calls: { name: string; args: unknown[] }[] = [];
  const action = (name: string, okData: unknown) => {
    return (...args: unknown[]) => {
      calls.push({ name, args });
      const failure = failures[name];
      if (failure)
        return Promise.resolve({ ok: false as const, error: failure });
      return Promise.resolve({ ok: true as const, data: okData });
    };
  };
  const recorded = (name: string, okData: unknown) =>
    action(name, okData) as unknown as () => Promise<never>;

  const auth: FakeAuth = {
    isConfigured: true,
    loading: false,
    session: TEST_SESSION,
    user: TEST_USER,
    profile: TEST_PROFILE,
    signInWithPassword: recorded("signInWithPassword", undefined),
    signUp: recorded("signUp", { needsEmailConfirmation: false }),
    signInWithProvider: recorded("signInWithProvider", undefined),
    signOut: recorded("signOut", undefined),
    requestPasswordReset: recorded("requestPasswordReset", undefined),
    updatePassword: recorded("updatePassword", undefined),
    updateProfile: recorded("updateProfile", TEST_PROFILE),
    refreshProfile: () => {
      calls.push({ name: "refreshProfile", args: [] });
      return Promise.resolve();
    },
    deleteAccount: recorded("deleteAccount", undefined),
    completeAuthRedirect: recorded("completeAuthRedirect", { returnTo: "/" }),
    ...overrides,
    calls,
  };
  return auth;
}

/**
 * Renders a page inside the app providers, a memory router and a fake auth
 * context. The page is mounted at `path` as a child route, so navigation
 * away swaps in the sibling placeholder content.
 */
export function renderPage(
  element: ReactNode,
  auth: AuthContextValue,
  options: { path?: string; initialEntries?: string[] } = {},
) {
  const path = options.path ?? "/login";
  const route = (routePath: string) =>
    `/${routePath}` === path
      ? { path: routePath, element }
      : { path: routePath, element: <p>{routePath} content</p> };
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <AuthContext.Provider value={auth}>
            <Outlet />
          </AuthContext.Provider>
        ),
        children: [
          { index: true, element: <p>home content</p> },
          route("login"),
          route("profile"),
          route("reset-password"),
          route("auth/callback"),
          route("u/:username"),
          route("admin/reports"),
        ],
      },
    ],
    { initialEntries: options.initialEntries ?? [path] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}
