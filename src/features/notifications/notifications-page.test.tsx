import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import type { AuthContextValue } from "@/lib/auth/types";
import { createFakeAuth } from "@/features/account/test-utils";
import { NotificationsPage } from "@/features/notifications/notifications-page";

const mocks = vi.hoisted(() => ({
  useNotifications: vi.fn(),
  useUnreadNotificationCount: vi.fn(),
  useMarkNotificationRead: vi.fn(),
  useMarkAllNotificationsRead: vi.fn(),
  useDeleteNotification: vi.fn(),
}));

vi.mock("@/lib/notifications/queries", () => ({
  useNotifications: mocks.useNotifications,
  useUnreadNotificationCount: mocks.useUnreadNotificationCount,
}));

vi.mock("@/lib/notifications/mutations", () => ({
  useMarkNotificationRead: mocks.useMarkNotificationRead,
  useMarkAllNotificationsRead: mocks.useMarkAllNotificationsRead,
  useDeleteNotification: mocks.useDeleteNotification,
}));

vi.mock("@/features/feed/relative-time", () => ({
  formatRelativeTime: () => "2h ago",
}));

function mutationResult(overrides: Record<string, unknown> = {}) {
  return {
    mutateAsync: vi.fn(async () => ({ ok: true, data: undefined })),
    mutate: vi.fn(),
    isPending: false,
    ...overrides,
  };
}

function infiniteResult(
  pages: unknown[],
  overrides: Record<string, unknown> = {},
) {
  return {
    data: { pages, pageParams: [null] },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(async () => undefined),
    hasNextPage: false,
    isFetchingNextPage: false,
    ...overrides,
  };
}

function countResult(count: number, overrides: Record<string, unknown> = {}) {
  return {
    data: count,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: "n-1",
    type: "like",
    postId: "post-1",
    commentId: null,
    groupId: null,
    moderationActionId: null,
    createdAt: "2026-11-18T10:00:00.000Z",
    readAt: null,
    actor: {
      id: "user-2",
      username: "brock",
      displayName: "Brock",
      avatarSpecies: "Onix",
    },
    group: null,
    moderationAction: null,
    ...overrides,
  };
}

function renderNotificationsPage(auth: AuthContextValue) {
  const router = createMemoryRouter(
    [
      {
        path: "/notifications",
        element: (
          <AuthContext.Provider value={auth}>
            <NotificationsPage />
          </AuthContext.Provider>
        ),
      },
      {
        path: "/login",
        element: <div>Login page</div>,
      },
    ],
    { initialEntries: ["/notifications"] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useNotifications.mockReturnValue(infiniteResult([]));
    mocks.useUnreadNotificationCount.mockReturnValue(countResult(0));
    mocks.useMarkNotificationRead.mockReturnValue(mutationResult());
    mocks.useMarkAllNotificationsRead.mockReturnValue(mutationResult());
    mocks.useDeleteNotification.mockReturnValue(mutationResult());
  });

  it("shows a sign-in prompt while signed out", () => {
    renderNotificationsPage(
      createFakeAuth({ user: null, session: null, profile: null }),
    );

    expect(
      screen.getByText("Sign in to see your notifications."),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?returnTo=/notifications",
    );
  });

  it("shows skeletons while loading", () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([], { isPending: true }),
    );
    renderNotificationsPage(createFakeAuth());

    expect(screen.getByLabelText("Loading notifications")).toBeVisible();
  });

  it("shows an error with a retry button", () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([], {
        isError: true,
        error: { code: "unknown", message: "Something went wrong" },
      }),
    );
    renderNotificationsPage(createFakeAuth());

    expect(screen.getByText("Could not load notifications")).toBeVisible();
    expect(screen.getByText("Something went wrong")).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  it("shows an empty state with no notifications", () => {
    renderNotificationsPage(createFakeAuth());

    expect(screen.getByText(/No notifications yet/i)).toBeVisible();
  });

  it("renders rows with actor, sentence, time and links", () => {
    mocks.useNotifications.mockReturnValue(infiniteResult([item()]));
    renderNotificationsPage(createFakeAuth());

    expect(screen.getByText("Brock")).toBeVisible();
    expect(screen.getByText("liked your post")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "liked your post" }),
    ).toHaveAttribute("href", "/post/post-1");
    expect(screen.getByRole("link", { name: "Brock" })).toHaveAttribute(
      "href",
      "/u/brock",
    );
    expect(screen.getByText("2h ago")).toBeVisible();
  });

  it("highlights unread rows and offers mark-as-read", () => {
    mocks.useNotifications.mockReturnValue(infiniteResult([item()]));
    renderNotificationsPage(createFakeAuth());

    expect(
      screen.getByRole("button", {
        name: /mark brock's notification as read/i,
      }),
    ).toBeVisible();
  });

  it("does not offer mark-as-read on read rows", () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([item({ readAt: "2026-11-18T11:00:00.000Z" })]),
    );
    renderNotificationsPage(createFakeAuth());

    expect(screen.queryByRole("button", { name: /mark as read/i })).toBeNull();
  });

  it("marks a notification read on click", async () => {
    const markRead = mutationResult();
    mocks.useMarkNotificationRead.mockReturnValue(markRead);
    mocks.useNotifications.mockReturnValue(infiniteResult([item()]));
    renderNotificationsPage(createFakeAuth());

    await userEvent.setup().click(
      screen.getByRole("button", {
        name: /mark brock's notification as read/i,
      }),
    );

    await waitFor(() =>
      expect(markRead.mutateAsync).toHaveBeenCalledWith("n-1"),
    );
  });

  it("deletes a notification on click", async () => {
    const remove = mutationResult();
    mocks.useDeleteNotification.mockReturnValue(remove);
    mocks.useNotifications.mockReturnValue(infiniteResult([item()]));
    renderNotificationsPage(createFakeAuth());

    await userEvent.setup().click(
      screen.getByRole("button", {
        name: /delete notification from brock/i,
      }),
    );

    await waitFor(() => expect(remove.mutateAsync).toHaveBeenCalledWith("n-1"));
  });

  it("shows Mark all as read when there are unread notifications", () => {
    mocks.useUnreadNotificationCount.mockReturnValue(countResult(2));
    renderNotificationsPage(createFakeAuth());

    expect(
      screen.getByRole("button", { name: /mark all as read/i }),
    ).toBeVisible();
  });

  it("hides Mark all as read when everything is read", () => {
    renderNotificationsPage(createFakeAuth());

    expect(
      screen.queryByRole("button", { name: /mark all as read/i }),
    ).toBeNull();
  });

  it("marks all notifications read on click", async () => {
    const markAll = mutationResult();
    mocks.useMarkAllNotificationsRead.mockReturnValue(markAll);
    mocks.useUnreadNotificationCount.mockReturnValue(countResult(2));
    renderNotificationsPage(createFakeAuth());

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /mark all as read/i }));

    await waitFor(() => expect(markAll.mutateAsync).toHaveBeenCalled());
  });

  it("loads more pages when the button is clicked", async () => {
    const fetchNextPage = vi.fn(async () => undefined);
    mocks.useNotifications.mockReturnValue(
      infiniteResult([item()], {
        hasNextPage: true,
        fetchNextPage,
      }),
    );
    renderNotificationsPage(createFakeAuth());

    expect(screen.getByText("Brock")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() => expect(fetchNextPage).toHaveBeenCalled());
  });

  it("shows Loading… while fetching the next page", () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([item()], { hasNextPage: true, isFetchingNextPage: true }),
    );
    renderNotificationsPage(createFakeAuth());

    expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
  });

  it("renders moderation, appeal and group invite rows", () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([
        item({
          id: "n-2",
          type: "moderation",
          postId: null,
          moderationActionId: "action-1",
          moderationAction: {
            id: "action-1",
            action: "remove",
            targetType: "post",
            reason: "Spam",
          },
        }),
        item({
          id: "n-3",
          type: "group_invite",
          postId: null,
          groupId: "group-1",
          group: { id: "group-1", slug: "test-group", name: "Test Group" },
        }),
      ]),
    );
    renderNotificationsPage(createFakeAuth());

    expect(screen.getByText("removed your post: Spam")).toBeVisible();
    expect(screen.getByText("invited you to Test Group")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "invited you to Test Group" }),
    ).toHaveAttribute("href", "/g/test-group");
  });
});
