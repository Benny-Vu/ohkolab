import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { AuthContext } from "@/lib/auth/use-auth";
import type { AuthContextValue } from "@/lib/auth/types";
import { Providers } from "@/app/providers";
import { createFakeAuth } from "@/features/account/test-utils";
import { NotificationBell } from "@/features/notifications/notification-bell";

const mocks = vi.hoisted(() => ({
  useUnreadNotificationCount: vi.fn(),
  useNotifications: vi.fn(),
}));

// Only the query hooks are mocked: the bell panel renders the real grouped
// list against an empty page, with the mutations stubbed to inert.
vi.mock("@/lib/notifications/queries", () => ({
  useUnreadNotificationCount: mocks.useUnreadNotificationCount,
  useNotifications: mocks.useNotifications,
}));
vi.mock("@/lib/notifications/mutations", () => ({
  useMarkNotificationRead: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMarkAllNotificationsRead: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteNotification: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/social/queries", () => ({
  useFollowStates: () => ({ data: new Map() }),
}));

function queryResult(data: number) {
  return { data, isPending: false, isError: false, error: null };
}

function emptyPages() {
  return {
    data: { pages: [] },
    isPending: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  };
}

function renderBell(auth: AuthContextValue = createFakeAuth()) {
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

/** jsdom's matchMedia stand-in says "not desktop"; this flips it. */
function pretendDesktop() {
  return vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("768"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList,
  );
}

describe("NotificationBell", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the notifications as a panel instead of navigating", async () => {
    mocks.useUnreadNotificationCount.mockReturnValue(queryResult(3));
    mocks.useNotifications.mockReturnValue(emptyPages());
    const user = userEvent.setup();
    renderBell();

    // No link to /notifications any more; the bell is a button.
    expect(
      screen.queryByRole("link", { name: /Notifications/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Notifications/ }));

    // The panel carries the list header: the title and, with unread
    // notifications, "Mark all read".
    await waitFor(() => {
      expect(screen.getAllByText("Notifications").length).toBeGreaterThan(0);
    });
    expect(
      screen.getByRole("button", { name: "Mark all as read" }),
    ).toBeVisible();
  });

  it("shows the unread count in the badge", () => {
    mocks.useUnreadNotificationCount.mockReturnValue(queryResult(3));
    mocks.useNotifications.mockReturnValue(emptyPages());
    renderBell();

    expect(
      screen.getByRole("button", { name: "Notifications, 3 unread" }),
    ).toBeVisible();
    expect(screen.getByText("3")).toBeVisible();
  });

  it("caps the badge at 99+", () => {
    mocks.useUnreadNotificationCount.mockReturnValue(queryResult(250));
    mocks.useNotifications.mockReturnValue(emptyPages());
    renderBell();

    expect(
      screen.getByRole("button", { name: "Notifications, 99+ unread" }),
    ).toBeVisible();
    expect(screen.getByText("99+")).toBeVisible();
  });

  it("shows the sign-in panel while signed out", async () => {
    mocks.useUnreadNotificationCount.mockReturnValue(queryResult(3));
    mocks.useNotifications.mockReturnValue(emptyPages());
    const user = userEvent.setup();
    renderBell(createFakeAuth({ user: null, session: null, profile: null }));

    expect(screen.getByRole("button", { name: "Notifications" })).toBeVisible();
    expect(screen.queryByText("3")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(
      await screen.findByRole("link", { name: "Sign in" }),
    ).toHaveAttribute("href", "/login?returnTo=/notifications");
  });

  it("opens as a popover on desktop widths", async () => {
    mocks.useUnreadNotificationCount.mockReturnValue(queryResult(0));
    mocks.useNotifications.mockReturnValue(emptyPages());
    const matchMediaSpy = pretendDesktop();
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    // The panel chunk lazy-loads, then asks the viewport which shape to be.
    await waitFor(() => {
      expect(screen.getAllByText("Notifications").length).toBeGreaterThan(0);
    });
    expect(matchMediaSpy).toHaveBeenCalled();
  });
});
