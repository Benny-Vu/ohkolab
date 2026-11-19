import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "@/lib/auth/use-auth";
import { createFakeAuth } from "@/features/account/test-utils";
import { FollowBackButton } from "@/features/notifications/follow-back-button";

const mocks = vi.hoisted(() => ({
  useFollowState: vi.fn(),
  useToggleFollow: vi.fn(),
}));

// Only the two social hooks the button touches are faked; no network.
vi.mock("@/lib/social", () => ({
  useFollowState: mocks.useFollowState,
  useToggleFollow: mocks.useToggleFollow,
}));

const ACTOR = {
  id: "user-2",
  username: "brock",
  displayName: "Brock",
  avatarSpecies: "Onix",
};

function followStateResult(data: boolean | undefined) {
  return { data, isPending: false, isError: false, error: null };
}

function toggleResult(overrides: Record<string, unknown> = {}) {
  return {
    mutateAsync: vi.fn(async () => ({ ok: true, data: undefined })),
    isPending: false,
    ...overrides,
  };
}

function renderFollowBackButton(auth = createFakeAuth()) {
  return render(
    <AuthContext.Provider value={auth}>
      <FollowBackButton actor={ACTOR} />
    </AuthContext.Provider>,
  );
}

describe("FollowBackButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useFollowState.mockReturnValue(followStateResult(false));
    mocks.useToggleFollow.mockReturnValue(toggleResult());
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("offers Follow when the reader does not follow the actor back", () => {
    renderFollowBackButton();

    expect(screen.getByRole("button", { name: "Follow" })).toBeVisible();
  });

  it("shows Following when the reader already follows the actor", () => {
    mocks.useFollowState.mockReturnValue(followStateResult(true));
    renderFollowBackButton();

    expect(screen.getByRole("button", { name: "Following" })).toBeVisible();
  });

  it("follows the actor on click", async () => {
    const toggle = toggleResult();
    mocks.useToggleFollow.mockReturnValue(toggle);
    renderFollowBackButton();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Follow" }));

    await waitFor(() => expect(toggle.mutateAsync).toHaveBeenCalled());
  });

  it("waits while the toggle is in flight", () => {
    mocks.useToggleFollow.mockReturnValue(toggleResult({ isPending: true }));
    renderFollowBackButton();

    expect(screen.getByRole("button", { name: "Follow" })).toBeDisabled();
  });

  it("renders nothing while signed out", () => {
    renderFollowBackButton(
      createFakeAuth({ user: null, session: null, profile: null }),
    );

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("still renders a button while the follow state is loading", () => {
    mocks.useFollowState.mockReturnValue(followStateResult(undefined));
    renderFollowBackButton();

    // Unknown state reads as "not following yet": offer the follow.
    expect(screen.getByRole("button", { name: "Follow" })).toBeVisible();
  });
});
