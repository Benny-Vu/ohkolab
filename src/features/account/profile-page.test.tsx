import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socialMocks.socialAvailability.mockReturnValue("not-configured");
    socialMocks.useBlocks.mockReturnValue(queryResult([]));
    socialMocks.useToggleBlock.mockReturnValue(mutationResult());
    profileQueriesMocks.useProfilesByIds.mockReturnValue(queryResult([]));
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

  it("shows the editor with the profile values when signed in", () => {
    renderPage(<ProfilePage />, createFakeAuth(), { path: "/profile" });
    expect(screen.getByLabelText("Username")).toHaveValue(
      TEST_PROFILE.username,
    );
    expect(screen.getByLabelText("Display name")).toHaveValue(
      TEST_PROFILE.displayName,
    );
    expect(screen.getByLabelText("Bio")).toHaveValue(TEST_PROFILE.bio);
    expect(screen.getByAltText("Pikachu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeEnabled();
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
