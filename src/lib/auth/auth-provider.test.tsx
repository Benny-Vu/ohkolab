import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/lib/auth/auth-provider";
import { AuthContext, GUEST_AUTH, useAuth } from "@/lib/auth/use-auth";
import type { AuthContextValue, Profile, Session } from "@/lib/auth/types";
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

const PROFILE: Profile = {
  id: "user-1",
  username: "ash",
  displayName: "Ash Ketchum",
  avatarSpecies: "Pikachu",
  bio: "Champion of Kanto.",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
};

const SESSION: { user: { id: string } } = { user: { id: "user-1" } };

/** Reads the context value from inside a provider under test. */
function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="configured">{String(auth.isConfigured)}</span>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.user?.id ?? "none"}</span>
      <span data-testid="profile">{auth.profile?.username ?? "none"}</span>
    </div>
  );
}

function readTestid(id: string): string {
  return screen.getByTestId(id).textContent ?? "";
}

type ProfileFetchResult = { data: ProfileRow | null; error: unknown };

/**
 * A Supabase client stand-in: the auth-state listener is captured so tests
 * can fire it, and every profile fetch stays pending until the test resolves
 * it, so loading states can be observed.
 */
function createFakeClient() {
  const listener = vi.fn();
  const unsubscribe = vi.fn();
  const onAuthStateChange = vi.fn((callback: unknown) => {
    listener.mockImplementation(callback as never);
    return { data: { subscription: { unsubscribe } } };
  });

  const pending: Array<(result: ProfileFetchResult) => void> = [];
  const from = vi.fn((table: string) => {
    if (table !== "profiles") throw new Error(`unexpected table: ${table}`);
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            new Promise<ProfileFetchResult>((resolve) => {
              pending.push(resolve);
            }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: () =>
              new Promise<ProfileFetchResult>((resolve) => {
                pending.push(resolve);
              }),
          }),
        }),
      }),
    };
  });

  const auth = {
    onAuthStateChange,
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
  const client = { auth, from } as unknown as AppSupabaseClient;

  /** Resolves the oldest pending profile fetch, if any. */
  const resolveFetch = (result: ProfileFetchResult) => {
    const resolve = pending.shift();
    if (resolve) resolve(result);
  };

  return {
    client,
    listener,
    unsubscribe,
    onAuthStateChange,
    from,
    resolveFetch,
  };
}

type FakeClient = ReturnType<typeof createFakeClient>;

/** Fires the auth-state listener, as Supabase does for a stored session. */
async function signInAs(fake: FakeClient, session: Session | null) {
  await act(async () => {
    fake.listener("INITIAL_SESSION", session);
  });
}

function renderWithProvider(client: AppSupabaseClient | null) {
  return render(
    <AuthProvider client={client}>
      <Probe />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  it("provides the guest state without a client", () => {
    renderWithProvider(null);

    expect(readTestid("configured")).toBe("false");
    expect(readTestid("loading")).toBe("false");
    expect(readTestid("user")).toBe("none");
    expect(readTestid("profile")).toBe("none");
  });

  it("starts loading until the stored session is known", () => {
    const fake = createFakeClient();
    renderWithProvider(fake.client);

    expect(readTestid("configured")).toBe("true");
    expect(readTestid("loading")).toBe("true");
  });

  it("subscribes to auth-state changes and unsubscribes on unmount", () => {
    const fake = createFakeClient();
    const { unmount } = renderWithProvider(fake.client);

    expect(fake.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(fake.unsubscribe).not.toHaveBeenCalled();

    unmount();
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("becomes ready with the user and profile once the session arrives", async () => {
    const fake = createFakeClient();
    renderWithProvider(fake.client);

    await signInAs(fake, SESSION as unknown as Session);
    expect(readTestid("loading")).toBe("true"); // profile still pending

    await act(async () => {
      fake.resolveFetch({ data: PROFILE_ROW, error: null });
    });

    await waitFor(() => {
      expect(readTestid("loading")).toBe("false");
    });
    expect(readTestid("user")).toBe("user-1");
    expect(readTestid("profile")).toBe("ash");
  });

  it("stays ready with no user when the stored session is null", async () => {
    const fake = createFakeClient();
    renderWithProvider(fake.client);

    await signInAs(fake, null);

    await waitFor(() => {
      expect(readTestid("loading")).toBe("false");
    });
    expect(readTestid("user")).toBe("none");
    expect(readTestid("profile")).toBe("none");
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("shows no profile when the profile fetch fails", async () => {
    const fake = createFakeClient();
    renderWithProvider(fake.client);

    await signInAs(fake, SESSION as unknown as Session);
    await act(async () => {
      fake.resolveFetch({ data: null, error: { code: "PGRST205" } });
    });

    await waitFor(() => {
      expect(readTestid("loading")).toBe("false");
    });
    expect(readTestid("profile")).toBe("none");
  });

  it("ignores a profile fetched for a previous user", async () => {
    const fake = createFakeClient();
    renderWithProvider(fake.client);

    // user-1 signs in, then switches to user-2 before the fetch resolves.
    await signInAs(fake, SESSION as unknown as Session);
    await signInAs(fake, { user: { id: "user-2" } } as unknown as Session);

    // The fetch for user-1 resolves late: it must be ignored.
    await act(async () => {
      fake.resolveFetch({ data: PROFILE_ROW, error: null });
    });
    expect(readTestid("user")).toBe("user-2");
    expect(readTestid("profile")).toBe("none");

    // The fetch for user-2 resolves and is used.
    await act(async () => {
      fake.resolveFetch({ data: PROFILE_ROW, error: null });
    });
    await waitFor(() => {
      expect(readTestid("profile")).toBe("ash");
    });
  });
});

describe("AuthProvider actions", () => {
  function renderValue(client: AppSupabaseClient | null) {
    let value: AuthContextValue | null = null;
    render(
      <AuthProvider client={client}>
        <AuthContext.Consumer>
          {(context) => {
            value = context;
            return null;
          }}
        </AuthContext.Consumer>
      </AuthProvider>,
    );
    return () => value as AuthContextValue;
  }

  it("fails with session_expired when updating the profile as a guest", async () => {
    const fake = createFakeClient();
    const getValue = renderValue(fake.client);

    const result = await getValue().updateProfile({ bio: "Hello!" });
    expect(result).toEqual({
      ok: false,
      error: {
        code: "session_expired",
        message: "Your session has expired. Sign in again.",
      },
    });
  });

  it("updates the profile and exposes the new one", async () => {
    const fake = createFakeClient();
    const getValue = renderValue(fake.client);

    await signInAs(fake, SESSION as unknown as Session);
    await act(async () => {
      fake.resolveFetch({ data: PROFILE_ROW, error: null });
    });
    await waitFor(() => expect(getValue().profile).toEqual(PROFILE));

    // The update call itself stays pending until the test resolves it.
    const update = getValue().updateProfile({ username: "ash" });
    await act(async () => {
      fake.resolveFetch({ data: PROFILE_ROW, error: null });
      await update;
    });
    expect((await update).ok).toBe(true);
    await waitFor(() => expect(getValue().profile).toEqual(PROFILE));
  });

  it("refreshes the profile on demand", async () => {
    const fake = createFakeClient();
    const getValue = renderValue(fake.client);

    await signInAs(fake, SESSION as unknown as Session);
    await act(async () => {
      fake.resolveFetch({ data: PROFILE_ROW, error: null });
    });
    await waitFor(() => expect(getValue().profile).toEqual(PROFILE));

    await act(async () => {
      const refresh = getValue().refreshProfile();
      fake.resolveFetch({ data: PROFILE_ROW, error: null });
      await refresh;
    });
    expect(getValue().profile).toEqual(PROFILE);
  });

  it("does nothing when a guest refreshes the profile", async () => {
    const getValue = renderValue(null);

    await act(async () => {
      await getValue().refreshProfile();
    });
    expect(getValue().profile).toBeNull();
  });
});

describe("GUEST_AUTH", () => {
  it("is the context default outside a provider", () => {
    render(<Probe />);

    expect(readTestid("configured")).toBe("false");
    expect(readTestid("loading")).toBe("false");
    expect(readTestid("user")).toBe("none");
    expect(readTestid("profile")).toBe("none");
  });

  it("fails every action with not_configured", async () => {
    const result = await GUEST_AUTH.signInWithPassword(
      "ash@example.com",
      "password1",
    );
    expect(result).toEqual({
      ok: false,
      error: {
        code: "not_configured",
        message:
          "Accounts are not available in this build. The tools still work without one.",
      },
    });
    expect((await GUEST_AUTH.updateProfile({ bio: "Hello!" })).ok).toBe(false);
    expect((await GUEST_AUTH.deleteAccount()).ok).toBe(false);
    await expect(GUEST_AUTH.refreshProfile()).resolves.toBeUndefined();
  });
});
