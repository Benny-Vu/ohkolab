import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ProfilePage } from "@/features/account/profile-page";
import {
  createFakeAuth,
  renderPage,
  TEST_PROFILE,
} from "@/features/account/test-utils";

describe("ProfilePage", () => {
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

  it("refreshes the profile on demand", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<ProfilePage />, auth, { path: "/profile" });

    await user.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() =>
      expect(auth.calls.map((c) => c.name)).toContain("refreshProfile"),
    );
  });
});
