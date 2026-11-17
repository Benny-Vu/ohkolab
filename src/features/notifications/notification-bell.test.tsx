import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { AuthContext } from "@/lib/auth/use-auth";
import { Providers } from "@/app/providers";
import { createFakeAuth } from "@/features/account/test-utils";
import { NotificationBell } from "@/features/notifications/notification-bell";

const mocks = vi.hoisted(() => ({
  useUnreadNotificationCount: vi.fn(),
}));

vi.mock("@/lib/notifications/queries", () => ({
  useUnreadNotificationCount: mocks.useUnreadNotificationCount,
}));

function renderBell(auth = createFakeAuth()) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <AuthContext.Provider value={auth}>
            <NotificationBell />
          </AuthContext.Provider>
        ),
      },
    ],
    { initialEntries: ["/"] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("NotificationBell", () => {
  it("links to /notifications", () => {
    mocks.useUnreadNotificationCount.mockReturnValue({
      data: 0,
      isPending: false,
      isError: false,
      error: null,
    });
    renderBell();

    expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute(
      "href",
      "/notifications",
    );
  });

  it("shows the unread count in the badge", () => {
    mocks.useUnreadNotificationCount.mockReturnValue({
      data: 3,
      isPending: false,
      isError: false,
      error: null,
    });
    renderBell();

    expect(
      screen.getByRole("link", { name: "Notifications, 3 unread" }),
    ).toBeVisible();
    expect(screen.getByText("3")).toBeVisible();
  });

  it("caps the badge at 99+", () => {
    mocks.useUnreadNotificationCount.mockReturnValue({
      data: 250,
      isPending: false,
      isError: false,
      error: null,
    });
    renderBell();

    expect(
      screen.getByRole("link", { name: "Notifications, 99+ unread" }),
    ).toBeVisible();
    expect(screen.getByText("99+")).toBeVisible();
  });

  it("hides the badge while signed out", () => {
    mocks.useUnreadNotificationCount.mockReturnValue({
      data: 3,
      isPending: false,
      isError: false,
      error: null,
    });
    renderBell(createFakeAuth({ user: null, session: null, profile: null }));

    expect(screen.getByRole("link", { name: "Notifications" })).toBeVisible();
    expect(screen.queryByText("3")).toBeNull();
  });
});
