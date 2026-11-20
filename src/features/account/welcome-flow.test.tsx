import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WelcomeFlow } from "@/features/account/welcome-flow";
import {
  createFakeAuth,
  renderPage,
  TEST_PROFILE,
} from "@/features/account/test-utils";
import { track } from "@/lib/telemetry/analytics";

vi.mock("@/lib/telemetry/analytics", () => ({
  track: vi.fn(),
  trackPageView: vi.fn(),
}));

// The flow needs the social layer "ready"; the hooks behind the lazy steps
// never reach the network because the test client is null.
const availabilityMocks = vi.hoisted(() => ({
  socialAvailability: vi.fn<() => "ready" | "not-configured" | "not-installed">(
    () => "ready",
  ),
  isSocialNotInstalled: vi.fn(() => false),
  softReadError: vi.fn((_error: unknown, empty: unknown) => empty),
  describeWriteError: vi.fn(() => ({
    code: "unknown" as const,
    message: "Something went wrong. Try again.",
  })),
  markSocialNotInstalled: vi.fn(),
  resetSocialInstallState: vi.fn(),
}));
vi.mock("@/lib/social/availability", () => availabilityMocks);

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
const DONE_KEY = "ohkolab:welcome:user-1";

describe("WelcomeFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    availabilityMocks.socialAvailability.mockReturnValue("ready");
  });

  it("stays hidden while the username is still generated", () => {
    renderPage(
      <WelcomeFlow />,
      createFakeAuth({
        profile: { ...TEST_PROFILE, username: "trainer_0a1b2c3d4e" },
      }),
      { path: "/login" },
    );
    expect(screen.queryByText("Welcome to OHKOLab")).not.toBeInTheDocument();
  });

  it("stays hidden while the social layer is not configured", () => {
    availabilityMocks.socialAvailability.mockReturnValue("not-configured");
    renderPage(<WelcomeFlow />, createFakeAuth(), { path: "/login" });
    expect(screen.queryByText("Welcome to OHKOLab")).not.toBeInTheDocument();
  });

  it("stays hidden once the flow was finished before", () => {
    localStorage.setItem(DONE_KEY, "done");
    renderPage(<WelcomeFlow />, createFakeAuth(), { path: "/login" });
    expect(screen.queryByText("Welcome to OHKOLab")).not.toBeInTheDocument();
  });

  it("saves the step-one picks and moves to the follow step", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<WelcomeFlow />, auth, { path: "/login" });

    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Doubles" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      const call = auth.calls.find((c) => c.name === "updateProfile");
      expect(call?.args[0]).toEqual({ mainFormat: "doubles" });
    });
    expect(await screen.findByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("moves past an untouched step one without saving", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<WelcomeFlow />, auth, { path: "/login" });

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(auth.calls.map((c) => c.name)).not.toContain("updateProfile");
    expect(await screen.findByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("goes back a step", async () => {
    const user = userEvent.setup();
    renderPage(<WelcomeFlow />, createFakeAuth(), { path: "/login" });

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Step 2 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByText("Step 1 of 3")).toBeInTheDocument();
  });

  it("finishing marks the flow done and tracks it", async () => {
    const user = userEvent.setup();
    const first = renderPage(<WelcomeFlow />, createFakeAuth(), {
      path: "/login",
    });

    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(await screen.findByRole("button", { name: "Next" }));
    expect(await screen.findByText("Step 3 of 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(trackMock).toHaveBeenCalledWith("welcome_completed");
    expect(localStorage.getItem(DONE_KEY)).toBe("done");
    await waitFor(() =>
      expect(screen.queryByText("Welcome to OHKOLab")).not.toBeInTheDocument(),
    );

    // It does not come back on a later visit.
    first.unmount();
    renderPage(<WelcomeFlow />, createFakeAuth(), { path: "/login" });
    expect(screen.queryByText("Welcome to OHKOLab")).not.toBeInTheDocument();
  });

  it("skipping remembers the choice for next time", async () => {
    const user = userEvent.setup();
    renderPage(<WelcomeFlow />, createFakeAuth(), { path: "/login" });

    await user.click(screen.getByRole("button", { name: "Skip for now" }));

    expect(trackMock).toHaveBeenCalledWith("welcome_skipped");
    expect(localStorage.getItem(DONE_KEY)).toBe("done");
    expect(screen.queryByText("Welcome to OHKOLab")).not.toBeInTheDocument();
  });
});
