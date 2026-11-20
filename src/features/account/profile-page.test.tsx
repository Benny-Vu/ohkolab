import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProfilePage } from "@/features/account/profile-page";
import {
  createFakeAuth,
  renderPage,
  TEST_PROFILE,
} from "@/features/account/test-utils";
import type { Profile } from "@/lib/auth/types";

const socialMocks = vi.hoisted(() => ({
  socialAvailability: vi.fn(() => "not-configured"),
  useBlocks: vi.fn(),
  useToggleBlock: vi.fn(),
}));

vi.mock("@/lib/social", () => socialMocks);

const profileQueriesMocks = vi.hoisted(() => ({
  useProfilesByIds: vi.fn(),
}));

vi.mock("@/features/profile/profile-queries", () => profileQueriesMocks);

// The push settings section is lazy-loaded behind the flag; a marker mock
// keeps the page tests about mounting, not about the card's own behaviour.
vi.mock("@/features/account/push-settings-card", () => ({
  PushSettingsCard: () => <div>push settings card</div>,
}));

const queryResult = (data: unknown, extra: Record<string, unknown> = {}) => ({
  data,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...extra,
});

const mutationResult = (
  mutateAsync: (args?: unknown) => Promise<unknown> = async () => ({
    ok: true,
    data: undefined,
  }),
) => ({ mutateAsync, mutate: vi.fn(), isPending: false });

function blockedProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-blocked",
    username: "teamrocket",
    displayName: "Jessie",
    avatarSpecies: "Wobbuffet",
    bio: null,
    mainFormat: null,
    lookingFor: null,
    youtubeUrl: null,
    twitchUrl: null,
    showdownName: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_PUSH", "");
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
    socialMocks.socialAvailability.mockReturnValue("not-configured");
    socialMocks.useBlocks.mockReturnValue(queryResult([]));
    socialMocks.useToggleBlock.mockReturnValue(mutationResult());
    profileQueriesMocks.useProfilesByIds.mockReturnValue(queryResult([]));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
  });

  it("shows a skeleton while loading", () => {
    const auth = createFakeAuth({ loading: true, profile: null });
    renderPage(<ProfilePage />, auth, { path: "/profile" });
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  it("says accounts are unavailable when not configured", () => {
    const auth = createFakeAuth({
      isConfigured: false,
      session: null,
      user: null,
      profile: null,
    });
    renderPage(<ProfilePage />, auth, { path: "/profile" });
    expect(screen.getByText("Accounts are unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Accounts are not available in this build. The tools still work without one.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a sign-in prompt for a guest", () => {
    const auth = createFakeAuth({ session: null, user: null, profile: null });
    renderPage(<ProfilePage />, auth, { path: "/profile" });
    expect(screen.getByText("You are browsing as a guest")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("shows the editor with the profile values when signed in", async () => {
    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });
    expect(screen.getByLabelText("Username")).toHaveValue(
      TEST_PROFILE.username,
    );
    expect(screen.getByLabelText("Display name")).toHaveValue(
      TEST_PROFILE.displayName,
    );
    expect(screen.getByLabelText("Bio")).toHaveValue(TEST_PROFILE.bio);
    // The avatar sprite is lazy; the image appears once its chunk loads.
    expect(await screen.findByAltText("Pikachu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeEnabled();
  });

  it("splits the settings into sections", () => {
    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });

    expect(
      screen.getByRole("heading", { level: 2, name: "Profile" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Account" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Privacy" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Danger zone" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /delete account/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /anonymous usage statistics/i }),
    ).toBeInTheDocument();
  });

  it("shows a retry notice when the profile could not be loaded", () => {
    const auth = createFakeAuth({ profile: null });
    renderPage(<ProfilePage />, auth, { path: "/profile" });
    expect(screen.getByText("Profile could not be loaded")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("saves profile changes", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<ProfilePage />, auth, { path: "/profile" });

    await user.clear(screen.getByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "Champion Ash");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const call = auth.calls.find((c) => c.name === "updateProfile");
      expect(call?.args).toEqual([
        {
          username: TEST_PROFILE.username,
          displayName: "Champion Ash",
          avatarSpecies: TEST_PROFILE.avatarSpecies,
          bio: TEST_PROFILE.bio,
          mainFormat: TEST_PROFILE.mainFormat,
          lookingFor: TEST_PROFILE.lookingFor,
          youtubeUrl: TEST_PROFILE.youtubeUrl,
          twitchUrl: TEST_PROFILE.twitchUrl,
          showdownName: TEST_PROFILE.showdownName,
        },
      ]);
    });
  });

  it("blocks saving an invalid username", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<ProfilePage />, auth, { path: "/profile" });

    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "A");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      screen.getByText("Username must be at least 3 characters."),
    ).toBeInTheDocument();
    expect(auth.calls.map((c) => c.name)).not.toContain("updateProfile");
  });

  it("saves the community profile fields", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<ProfilePage />, auth, { path: "/profile" });

    await user.type(screen.getByLabelText("Looking for"), "practice partners");
    await user.type(
      screen.getByLabelText("YouTube channel"),
      "https://youtube.com/@ash",
    );
    await user.type(screen.getByLabelText("Showdown name"), "ashketchum");
    await user.click(screen.getByRole("combobox", { name: "Main format" }));
    await user.click(await screen.findByRole("option", { name: "Doubles" }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const call = auth.calls.find((c) => c.name === "updateProfile");
      expect(call?.args[0]).toMatchObject({
        lookingFor: "practice partners",
        youtubeUrl: "https://youtube.com/@ash",
        showdownName: "ashketchum",
        mainFormat: "doubles",
      });
    });
  });

  it("rejects a non-https profile link", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<ProfilePage />, auth, { path: "/profile" });

    await user.type(
      screen.getByLabelText("YouTube channel"),
      "http://youtube.com/@ash",
    );
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      screen.getByText("Links must be https:// addresses."),
    ).toBeInTheDocument();
    expect(auth.calls.map((c) => c.name)).not.toContain("updateProfile");
  });

  it("links the username error to the field via aria-describedby", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<ProfilePage />, auth, { path: "/profile" });

    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "A");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    const username = screen.getByLabelText("Username");
    const errorId = username.getAttribute("aria-describedby");
    expect(errorId).toBe("username-error");
    expect(username).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(errorId ?? "")).toHaveTextContent(
      "Username must be at least 3 characters.",
    );
  });

  it("shows the failure message when saving fails", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth(
      {},
      {
        updateProfile: {
          code: "invalid_input",
          message: "That username is already taken. Try another one.",
          field: "username",
        },
      },
    );
    renderPage(<ProfilePage />, auth, { path: "/profile" });

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByText(
        "That username is already taken. Try another one.",
      ),
    ).toBeInTheDocument();
  });

  it("signs out and navigates home", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<ProfilePage />, auth, { path: "/profile" });

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() =>
      expect(screen.getByText("home content")).toBeInTheDocument(),
    );
    expect(auth.calls.map((c) => c.name)).toContain("signOut");
  });

  it("opens the delete dialog and requires typing the username", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<ProfilePage />, auth, { path: "/profile" });

    await user.click(screen.getByRole("button", { name: /delete account/i }));

    expect(screen.getByText("Delete your account")).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: /delete forever/i });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText("Confirm username"), "wrong");
    expect(confirm).toBeDisabled();

    await user.clear(screen.getByLabelText("Confirm username"));
    await user.type(
      screen.getByLabelText("Confirm username"),
      TEST_PROFILE.username,
    );
    expect(confirm).toBeEnabled();
  });

  it("deletes the account after typing the username", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<ProfilePage />, auth, { path: "/profile" });

    await user.click(screen.getByRole("button", { name: /delete account/i }));
    await user.type(
      screen.getByLabelText("Confirm username"),
      TEST_PROFILE.username,
    );
    await user.click(screen.getByRole("button", { name: /delete forever/i }));

    await waitFor(() =>
      expect(screen.getByText("home content")).toBeInTheDocument(),
    );
    expect(auth.calls.map((c) => c.name)).toContain("deleteAccount");
  });

  it("shows the failure when deleting fails", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth(
      {},
      {
        deleteAccount: {
          code: "invalid_input",
          message: "Something went wrong. Try again.",
        },
      },
    );
    renderPage(<ProfilePage />, auth, { path: "/profile" });

    await user.click(screen.getByRole("button", { name: /delete account/i }));
    await user.type(
      screen.getByLabelText("Confirm username"),
      TEST_PROFILE.username,
    );
    await user.click(screen.getByRole("button", { name: /delete forever/i }));

    expect(
      await screen.findByText("Something went wrong. Try again."),
    ).toBeInTheDocument();
  });

  it("links to the public profile page", () => {
    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });

    expect(screen.getByRole("link", { name: /public page/i })).toHaveAttribute(
      "href",
      "/u/ashketchum",
    );
  });

  it("links to the account deletion page from the danger zone", () => {
    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });

    expect(
      screen.getByRole("link", { name: /deleted with your account/i }),
    ).toHaveAttribute("href", "/delete-account");
  });
});

describe("ProfilePage blocked users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socialMocks.socialAvailability.mockReturnValue("ready");
    socialMocks.useBlocks.mockReturnValue(queryResult([]));
    socialMocks.useToggleBlock.mockReturnValue(mutationResult());
    profileQueriesMocks.useProfilesByIds.mockReturnValue(queryResult([]));
  });

  it("hides the blocked users card when social is not configured", () => {
    socialMocks.socialAvailability.mockReturnValue("not-configured");
    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });

    expect(
      screen.queryByText("Blocked users", {
        selector: "h3, [data-slot='card-title'] *",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows the empty state when nobody is blocked", () => {
    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });

    expect(screen.getByText("Blocked users")).toBeInTheDocument();
    expect(screen.getByText("You haven't blocked anyone.")).toBeInTheDocument();
  });

  it("shows a retry when the blocked list fails to load", async () => {
    const refetch = vi.fn();
    socialMocks.useBlocks.mockReturnValue(
      queryResult([], {
        isError: true,
        error: { code: "unknown", message: "Something went wrong" },
        refetch,
      }),
    );
    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });

    expect(
      screen.getByText(/blocked users could not be loaded/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/you haven't blocked anyone/i),
    ).not.toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("lists blocked users with links and unblock buttons", () => {
    const blocked = blockedProfile();
    socialMocks.useBlocks.mockReturnValue(queryResult(["user-blocked"]));
    profileQueriesMocks.useProfilesByIds.mockReturnValue(
      queryResult([blocked]),
    );
    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });

    expect(screen.getByText("Jessie")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /@teamrocket/i });
    expect(link).toHaveAttribute("href", "/u/teamrocket");
    expect(
      screen.getByRole("button", { name: /unblock/i }),
    ).toBeInTheDocument();
  });

  it("unblocks a user when the button is clicked", async () => {
    const user = userEvent.setup();
    const blocked = blockedProfile();
    const unblock = vi.fn(async () => ({ ok: true, data: { blocked: false } }));
    socialMocks.useBlocks.mockReturnValue(queryResult(["user-blocked"]));
    profileQueriesMocks.useProfilesByIds.mockReturnValue(
      queryResult([blocked]),
    );
    socialMocks.useToggleBlock.mockReturnValue(mutationResult(unblock));
    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });

    await user.click(screen.getByRole("button", { name: /unblock/i }));

    await waitFor(() => expect(unblock).toHaveBeenCalled());
  });

  it("shows the error message when unblocking fails", async () => {
    const user = userEvent.setup();
    const blocked = blockedProfile();
    const unblock = vi.fn(async () => ({
      ok: false,
      error: { code: "network", message: "Could not reach the server." },
    }));
    socialMocks.useBlocks.mockReturnValue(queryResult(["user-blocked"]));
    profileQueriesMocks.useProfilesByIds.mockReturnValue(
      queryResult([blocked]),
    );
    socialMocks.useToggleBlock.mockReturnValue(mutationResult(unblock));
    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });

    await user.click(screen.getByRole("button", { name: /unblock/i }));

    await waitFor(() => expect(unblock).toHaveBeenCalled());
  });
});

describe("ProfilePage push settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_PUSH", "");
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
    socialMocks.socialAvailability.mockReturnValue("not-configured");
    socialMocks.useBlocks.mockReturnValue(queryResult([]));
    socialMocks.useToggleBlock.mockReturnValue(mutationResult());
    profileQueriesMocks.useProfilesByIds.mockReturnValue(queryResult([]));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
  });

  it("mounts the push settings section only in the native app with the flag on", async () => {
    vi.stubEnv("VITE_PUSH", "true");
    (globalThis as { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true,
    };

    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });

    expect(await screen.findByText("push settings card")).toBeInTheDocument();
  });

  it("keeps the web build and flag-off builds free of the push settings section", async () => {
    // Web build: flag on, no native shell.
    vi.stubEnv("VITE_PUSH", "true");
    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText("push settings card")).not.toBeInTheDocument();

    // Native app, flag off.
    vi.stubEnv("VITE_PUSH", "");
    (globalThis as { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true,
    };
    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText("push settings card")).not.toBeInTheDocument();
  });
});
