import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "@/lib/auth/use-auth";
import { createFakeAuth } from "@/features/account/test-utils";
import { FollowBackButton } from "@/features/notifications/follow-back-button";

const mocks = vi.hoisted(() => ({
  useToggleFollow: vi.fn(),
}));

// The button only touches the toggle; the following state arrives from
// the page's one batched useFollowStates query, passed in as a prop.
vi.mock("@/lib/social", () => ({
  useToggleFollow: mocks.useToggleFollow,
}));

const ACTOR = {
  id: "user-2",
  username: "brock",
  displayName: "Brock",
  avatarSpecies: "Onix",
};

function toggleResult(overrides: Record<string, unknown> = {}) {
  return {
    mutateAsync: vi.fn(async () => ({ ok: true, data: undefined })),
    isPending: false,
    ...overrides,
  };
}

function renderFollowBackButton(following: boolean, auth = createFakeAuth()) {
  return render(
    <AuthContext.Provider value={auth}>
      <FollowBackButton actor={ACTOR} following={following} />
    </AuthContext.Provider>,
  );
}

describe("FollowBackButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useToggleFollow.mockReturnValue(toggleResult());
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("offers Follow when the reader does not follow the actor back", () => {
    renderFollowBackButton(false);

    expect(screen.getByRole("button", { name: "Follow" })).toBeVisible();
  });

  it("shows Following when the reader already follows the actor", () => {
    renderFollowBackButton(true);

    expect(screen.getByRole("button", { name: "Following" })).toBeVisible();
  });

  it("follows the actor on click", async () => {
    const toggle = toggleResult();
    mocks.useToggleFollow.mockReturnValue(toggle);
    renderFollowBackButton(false);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Follow" }));

    await waitFor(() => expect(toggle.mutateAsync).toHaveBeenCalled());
  });

  it("waits while the toggle is in flight", () => {
    mocks.useToggleFollow.mockReturnValue(toggleResult({ isPending: true }));
    renderFollowBackButton(false);

    expect(screen.getByRole("button", { name: "Follow" })).toBeDisabled();
  });

  it("renders nothing while signed out", () => {
    renderFollowBackButton(
      false,
      createFakeAuth({ user: null, session: null, profile: null }),
    );

    expect(screen.queryByRole("button")).toBeNull();
  });
});
