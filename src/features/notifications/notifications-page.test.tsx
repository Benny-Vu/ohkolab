import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import type { AuthContextValue } from "@/lib/auth/types";
import { createFakeAuth } from "@/features/account/test-utils";
import { registerEnglishDomain } from "@/lib/i18n/en-loader";
import { battlesEn } from "@/lib/i18n/entries/battles";
import { NotificationsPage } from "@/features/notifications/notifications-page";

// Battle rows render one line from the battles dictionary; the test setup
// preloads every other domain, so this file registers it too.
registerEnglishDomain("battles", battlesEn);

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

vi.mock("@/lib/relative-time", () => ({
  formatRelativeTime: () => "2h ago",
}));

// The push opt-in card is lazy-loaded behind the flag; a marker mock keeps
// the page tests about mounting, not about the card's own behaviour.
vi.mock("@/features/notifications/push-permission-card", () => ({
  PushPermissionCard: () => <div>push permission card</div>,
}));

// Same for the follow-back button: its own test file covers its states.
vi.mock("@/features/notifications/follow-back-button", () => ({
  FollowBackButton: () => <div>follow back button</div>,
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

const MINUTE = 60_000;
const DAY = 24 * 60 * 60 * 1000;

/** A timestamp this long before now, so section tests never go stale. */
function ago(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString();
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
    vi.stubEnv("VITE_PUSH", "");
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
    mocks.useNotifications.mockReturnValue(infiniteResult([]));
    mocks.useUnreadNotificationCount.mockReturnValue(countResult(0));
    mocks.useMarkNotificationRead.mockReturnValue(mutationResult());
    mocks.useMarkAllNotificationsRead.mockReturnValue(mutationResult());
    mocks.useDeleteNotification.mockReturnValue(mutationResult());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
  });

  it("shows a sign-in prompt while signed out", () => {
    renderNotificationsPage(
      createFakeAuth({ user: null, session: null, profile: null }),
    );

    expect(screen.getByText("Sign in to see your notifications")).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?returnTo=/notifications",
    );
  });

  it("shows skeletons while loading", async () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([], { isPending: true }),
    );
    renderNotificationsPage(createFakeAuth());

    // The skeleton waits out the anti-flash delay, then role=status makes
    // the label a live region screen readers announce.
    expect(await screen.findByLabelText("Loading notifications")).toBeVisible();
    expect(
      screen.getByRole("status", { name: "Loading notifications" }),
    ).toBeVisible();
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

  it("exposes the unread state to screen readers", () => {
    mocks.useNotifications.mockReturnValue(infiniteResult([item()]));
    renderNotificationsPage(createFakeAuth());

    expect(screen.getByText("Unread")).toBeInTheDocument();
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

  it("disables the row actions while a mutation is pending", () => {
    mocks.useNotifications.mockReturnValue(infiniteResult([item()]));
    mocks.useMarkNotificationRead.mockReturnValue(
      mutationResult({ isPending: true }),
    );
    mocks.useDeleteNotification.mockReturnValue(
      mutationResult({ isPending: true }),
    );
    renderNotificationsPage(createFakeAuth());

    expect(
      screen.getByRole("button", {
        name: /mark brock's notification as read/i,
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: /delete notification from brock/i,
      }),
    ).toBeDisabled();
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

  it("mounts the push opt-in card only in the native app with the flag on", async () => {
    vi.stubEnv("VITE_PUSH", "true");
    (globalThis as { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true,
    };
    const native = renderNotificationsPage(createFakeAuth());

    expect(await screen.findByText("push permission card")).toBeInTheDocument();
    native.unmount();

    // The web build never shows it, even with the flag on.
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
    renderNotificationsPage(createFakeAuth());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText("push permission card")).not.toBeInTheDocument();
  });

  it("never mounts the push opt-in card while the flag is off", async () => {
    vi.stubEnv("VITE_PUSH", "");
    (globalThis as { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true,
    };
    renderNotificationsPage(createFakeAuth());

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText("push permission card")).not.toBeInTheDocument();
  });

  it("merges consecutive likes on one post into a grouped row", () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([
        item({ id: "n-1" }),
        item({
          id: "n-2",
          actor: {
            id: "user-3",
            username: "misty",
            displayName: "Misty",
            avatarSpecies: null,
          },
        }),
      ]),
    );
    renderNotificationsPage(createFakeAuth());

    expect(screen.getByText("and 1 other liked your post")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "and 1 other liked your post" }),
    ).toHaveAttribute("href", "/post/post-1");
    // The row is named after the most recent actor.
    expect(screen.getByRole("link", { name: "Brock" })).toBeVisible();
  });

  it("names both likes and comments in a mixed group", () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([
        item({ id: "n-1", type: "like" }),
        item({
          id: "n-2",
          type: "comment",
          actor: {
            id: "user-3",
            username: "misty",
            displayName: "Misty",
            avatarSpecies: null,
          },
        }),
      ]),
    );
    renderNotificationsPage(createFakeAuth());

    expect(
      screen.getByText("and 1 other liked and commented on your post"),
    ).toBeVisible();
  });

  it("keeps same-post notifications separate when they are not consecutive", () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([
        item({ id: "n-1" }),
        item({ id: "n-2", type: "follow", postId: null }),
        item({ id: "n-3" }),
      ]),
    );
    renderNotificationsPage(createFakeAuth());

    expect(screen.getAllByText("liked your post")).toHaveLength(2);
    expect(screen.getByText("followed you")).toBeVisible();
    expect(screen.queryByText(/others liked your post/)).toBeNull();
  });

  it("marks every notification in a group read from its row", async () => {
    const markRead = mutationResult();
    mocks.useMarkNotificationRead.mockReturnValue(markRead);
    mocks.useNotifications.mockReturnValue(
      infiniteResult([item({ id: "n-1" }), item({ id: "n-2" })]),
    );
    renderNotificationsPage(createFakeAuth());

    await userEvent.setup().click(
      screen.getByRole("button", {
        name: /mark brock's notifications as read/i,
      }),
    );

    await waitFor(() => {
      expect(markRead.mutateAsync).toHaveBeenCalledWith("n-1");
      expect(markRead.mutateAsync).toHaveBeenCalledWith("n-2");
    });
  });

  it("deletes every notification in a group from its row", async () => {
    const remove = mutationResult();
    mocks.useDeleteNotification.mockReturnValue(remove);
    mocks.useNotifications.mockReturnValue(
      infiniteResult([item({ id: "n-1" }), item({ id: "n-2" })]),
    );
    renderNotificationsPage(createFakeAuth());

    await userEvent.setup().click(
      screen.getByRole("button", {
        name: /delete brock's notifications/i,
      }),
    );

    await waitFor(() => {
      expect(remove.mutateAsync).toHaveBeenCalledWith("n-1");
      expect(remove.mutateAsync).toHaveBeenCalledWith("n-2");
    });
  });

  it("groups rows under Today, This week and Earlier headings", () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([
        // Different posts, so each row stays on its own line.
        item({ id: "n-today", postId: "post-a", createdAt: ago(MINUTE) }),
        item({ id: "n-week", postId: "post-b", createdAt: ago(3 * DAY) }),
        item({ id: "n-earlier", postId: "post-c", createdAt: ago(30 * DAY) }),
      ]),
    );
    renderNotificationsPage(createFakeAuth());

    expect(screen.getByRole("heading", { name: "Today" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "This week" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Earlier" })).toBeVisible();
  });

  it("shows only the sections that have rows", () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([item({ id: "n-today", createdAt: ago(MINUTE) })]),
    );
    renderNotificationsPage(createFakeAuth());

    expect(screen.getByRole("heading", { name: "Today" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "This week" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Earlier" })).toBeNull();
  });

  it("waits while mark-all-read is in flight", () => {
    mocks.useUnreadNotificationCount.mockReturnValue(countResult(2));
    mocks.useMarkAllNotificationsRead.mockReturnValue(
      mutationResult({ isPending: true }),
    );
    renderNotificationsPage(createFakeAuth());

    expect(
      screen.getByRole("button", { name: /mark all as read/i }),
    ).toBeDisabled();
  });

  it("shows the caught-up line when everything has been read", () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([item({ id: "n-1", readAt: "2026-11-18T11:00:00.000Z" })]),
    );
    renderNotificationsPage(createFakeAuth());

    expect(screen.getByText("You're all caught up")).toBeVisible();
  });

  it("does not show the caught-up line while something is unread", () => {
    mocks.useNotifications.mockReturnValue(infiniteResult([item()]));
    renderNotificationsPage(createFakeAuth());

    expect(screen.queryByText("You're all caught up")).toBeNull();
  });

  it("shows the follow-back button on follow notifications", () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([item({ id: "n-1", type: "follow", postId: null })]),
    );
    renderNotificationsPage(createFakeAuth());

    expect(screen.getByText("follow back button")).toBeVisible();
  });

  it("shows no follow-back button on like notifications", () => {
    mocks.useNotifications.mockReturnValue(infiniteResult([item()]));
    renderNotificationsPage(createFakeAuth());

    expect(screen.queryByText("follow back button")).toBeNull();
  });

  it("renders battle notifications with one neutral line to the board", () => {
    mocks.useNotifications.mockReturnValue(
      infiniteResult([item({ id: "n-1", type: "battle", postId: null })]),
    );
    renderNotificationsPage(createFakeAuth());

    // The row cannot tell an offer from an acceptance, so every battle
    // actor gets the same sentence, and no request content shows here.
    expect(screen.getByText("Brock")).toBeVisible();
    const line = screen.getByRole("link", {
      name: "sent you a battle request update",
    });
    expect(line).toHaveAttribute("href", "/battles");
    expect(screen.getByRole("link", { name: "Brock" })).toHaveAttribute(
      "href",
      "/u/brock",
    );
  });
});
