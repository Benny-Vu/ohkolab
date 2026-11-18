import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingDialog } from "@/features/account/onboarding-dialog";
import { needsOnboarding } from "@/features/account/onboarding";
import {
  createFakeAuth,
  renderPage,
  TEST_PROFILE,
} from "@/features/account/test-utils";
import type { Profile } from "@/lib/auth/types";
import { createFakeClient } from "@/lib/social/test-client";
import { track } from "@/lib/telemetry/analytics";

vi.mock("@/lib/telemetry/analytics", () => ({
  track: vi.fn(),
  trackPageView: vi.fn(),
}));

// The real picker pulls the whole dex; a stub keeps the test light.
vi.mock("@/components/pokemon-editor/species-picker", () => ({
  SpeciesPicker: (props: {
    value: string | null;
    onChange: (species: string) => void;
  }) => (
    <button type="button" onClick={() => props.onChange("Pikachu")}>
      {props.value ?? "Choose a Pokémon"}
    </button>
  ),
}));

const trackMock = vi.mocked(track);

const TAKEN_MESSAGE = "That username is already taken. Try another one.";

/** A fresh account as the auth server creates it: generated username only. */
function trainerProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    ...TEST_PROFILE,
    username: "trainer_0a1b2c3d4e",
    displayName: null,
    avatarSpecies: null,
    bio: null,
    ...overrides,
  };
}

describe("needsOnboarding", () => {
  it("is true only for a generated trainer_ username", () => {
    expect(needsOnboarding(trainerProfile())).toBe(true);
    expect(
      needsOnboarding({ ...TEST_PROFILE, username: "trainer_short" }),
    ).toBe(false);
    expect(needsOnboarding(TEST_PROFILE)).toBe(false);
    expect(needsOnboarding(null)).toBe(false);
  });
});

describe("OnboardingDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows for a generated trainer_ username", () => {
    renderPage(
      <OnboardingDialog />,
      createFakeAuth({ profile: trainerProfile() }),
      {
        path: "/login",
      },
    );
    expect(screen.getByText("Set up your profile")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveValue("");
  });

  it("does not show once a username was chosen", () => {
    renderPage(<OnboardingDialog />, createFakeAuth(), { path: "/login" });
    expect(screen.queryByText("Set up your profile")).not.toBeInTheDocument();
  });

  it("does not show while the session is still loading", () => {
    renderPage(
      <OnboardingDialog />,
      createFakeAuth({ loading: true, profile: null }),
      { path: "/login" },
    );
    expect(screen.queryByText("Set up your profile")).not.toBeInTheDocument();
  });

  it("checks availability live and accepts a free username", async () => {
    const user = userEvent.setup();
    const { client, records } = createFakeClient({
      tables: { profiles: { data: null } },
    });
    renderPage(
      <OnboardingDialog client={client} />,
      createFakeAuth({ profile: trainerProfile() }),
      { path: "/login" },
    );

    await user.type(screen.getByLabelText("Username"), "misty");
    await waitFor(() =>
      expect(screen.getByText("Available")).toBeInTheDocument(),
    );

    expect(records.length).toBeGreaterThan(0);
    const check = records[0]!;
    expect(check.table).toBe("profiles");
    expect(check.eqFilters).toEqual([["username", "misty"]]);
    expect(check.isMaybeSingle).toBe(true);
  });

  it("marks a taken username and blocks saving", async () => {
    const user = userEvent.setup();
    const { client } = createFakeClient({
      tables: { profiles: { data: { id: "user-2" } } },
    });
    renderPage(
      <OnboardingDialog client={client} />,
      createFakeAuth({ profile: trainerProfile() }),
      { path: "/login" },
    );

    await user.type(screen.getByLabelText("Username"), "misty");
    await waitFor(() =>
      expect(screen.getByText(TAKEN_MESSAGE)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves the profile and tracks onboarding_completed", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ profile: trainerProfile() });
    const { client } = createFakeClient({
      tables: { profiles: { data: null } },
    });
    renderPage(<OnboardingDialog client={client} />, auth, { path: "/login" });

    await user.type(screen.getByLabelText("Username"), "misty");
    await waitFor(() =>
      expect(screen.getByText("Available")).toBeInTheDocument(),
    );
    await user.type(screen.getByLabelText("Display name"), "Misty");
    await user.click(
      await screen.findByRole("button", { name: "Choose a Pokémon" }),
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(trackMock).toHaveBeenCalledWith("onboarding_completed"),
    );
    const call = auth.calls.find((c) => c.name === "updateProfile");
    expect(call?.args[0]).toEqual({
      username: "misty",
      displayName: "Misty",
      avatarSpecies: "Pikachu",
      bio: null,
    });
    await waitFor(() =>
      expect(screen.queryByText("Set up your profile")).not.toBeInTheDocument(),
    );
  });

  it("shows a server failure under the username field", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth(
      { profile: trainerProfile() },
      {
        updateProfile: {
          code: "invalid_input",
          message: TAKEN_MESSAGE,
          field: "username",
        },
      },
    );
    const { client } = createFakeClient({
      tables: { profiles: { data: null } },
    });
    renderPage(<OnboardingDialog client={client} />, auth, { path: "/login" });

    await user.type(screen.getByLabelText("Username"), "misty");
    await waitFor(() =>
      expect(screen.getByText("Available")).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByText(TAKEN_MESSAGE)).toBeInTheDocument(),
    );
    expect(screen.queryByText("Set up your profile")).toBeInTheDocument();
  });

  it("skipping hides the dialog for this visit and tracks the skip", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ profile: trainerProfile() });
    const first = renderPage(<OnboardingDialog />, auth, { path: "/login" });

    await user.click(screen.getByRole("button", { name: "Skip for now" }));

    expect(trackMock).toHaveBeenCalledWith("onboarding_skipped");
    expect(screen.queryByText("Set up your profile")).not.toBeInTheDocument();

    // A later visit starts fresh, so the step comes back until it is done.
    first.unmount();
    renderPage(<OnboardingDialog />, auth, { path: "/login" });
    expect(screen.getByText("Set up your profile")).toBeInTheDocument();
  });

  it("validates the username before saving", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ profile: trainerProfile() });
    renderPage(<OnboardingDialog />, auth, { path: "/login" });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Choose a username.")).toBeInTheDocument();
    expect(auth.calls.map((c) => c.name)).not.toContain("updateProfile");
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("works without a client: no availability check, save stays enabled", async () => {
    const user = userEvent.setup();
    renderPage(
      <OnboardingDialog client={null} />,
      createFakeAuth({ profile: trainerProfile() }),
      { path: "/login" },
    );

    await user.type(screen.getByLabelText("Username"), "misty");

    expect(screen.queryByText("Checking…")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});
