import { render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { vi } from "vitest";

import { AppLayout } from "@/app/app-layout";
import { Providers } from "@/app/providers";
import { NotFoundPage } from "@/features/system/not-found-page";
import type { AuthContextValue, Profile, User } from "@/lib/auth/types";
import { AuthContext, GUEST_AUTH } from "@/lib/auth/use-auth";

const TEST_USER = {
  id: "user-1",
  email: "ash@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
} as unknown as User;

const TEST_PROFILE: Profile = {
  id: "user-1",
  username: "ashketchum",
  displayName: "Ash",
  avatarSpecies: "Pikachu",
  bio: "Pallet Town",
  mainFormat: null,
  lookingFor: null,
  youtubeUrl: null,
  twitchUrl: null,
  showdownName: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

/** Auth state for a signed-in user, with a spied `signOut`. */
export function createSignedInAuth(): AuthContextValue {
  return {
    ...GUEST_AUTH,
    isConfigured: true,
    user: TEST_USER,
    profile: TEST_PROFILE,
    signOut: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  };
}

/** Renders the app frame at `path` with stub pages and the given auth state. */
export function renderAt(path: string, auth: AuthContextValue = GUEST_AUTH) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <AuthContext.Provider value={auth}>
            <AppLayout />
          </AuthContext.Provider>
        ),
        children: [
          { index: true, element: <p>home content</p> },
          { path: "calc", element: <p>calc content</p> },
          { path: "teams", element: <p>teams content</p> },
          { path: "teams/:teamId", element: <p>team content</p> },
          { path: "meta", element: <p>meta content</p> },
          { path: "profile", element: <p>profile content</p> },
          { path: "login", element: <p>login content</p> },
          { path: "auth/callback", element: <p>callback content</p> },
          { path: "reset-password", element: <p>reset content</p> },
          { path: "u/:username", element: <p>public profile content</p> },
          { path: "terms", element: <p>terms content</p> },
          { path: "privacy", element: <p>privacy content</p> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}
