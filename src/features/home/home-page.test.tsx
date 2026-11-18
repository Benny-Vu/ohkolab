import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import { createFakeAuth } from "@/features/account/test-utils";
import { HomePage } from "@/features/home/home-page";
import type { FeedPostRow } from "@/lib/database.types";

const availabilityMocks = vi.hoisted(() => ({
  socialAvailability: vi.fn(() => "not-configured"),
}));

const queriesMocks = vi.hoisted(() => ({
  useFeed: vi.fn(),
  useAuthorPosts: vi.fn(),
  usePost: vi.fn(),
  useComments: vi.fn(),
  useIsModerator: vi.fn(),
}));

const mutationsMocks = vi.hoisted(() => ({
  useCreatePost: vi.fn(),
  useUpdatePost: vi.fn(),
  useDeletePost: vi.fn(),
  useCreateComment: vi.fn(),
  useDeleteComment: vi.fn(),
  useCreateReport: vi.fn(),
  useToggleLike: vi.fn(),
  useToggleFollow: vi.fn(),
  useToggleBlock: vi.fn(),
}));

const moderationMocks = vi.hoisted(() => ({
  useRemoveContent: vi.fn(),
  useHandleReport: vi.fn(),
  useSuspendUser: vi.fn(),
}));

const groupsMocks = vi.hoisted(() => ({
  useMyGroups: vi.fn(),
}));

const metagameMocks = vi.hoisted(() => ({
  useMetagameSnapshot: vi.fn(),
}));

vi.mock("@/lib/social/availability", () => availabilityMocks);
vi.mock("@/lib/social/queries", () => queriesMocks);
vi.mock("@/lib/social/mutations", () => mutationsMocks);
vi.mock("@/lib/social/moderation", () => moderationMocks);
vi.mock("@/lib/groups/queries", () => groupsMocks);
vi.mock("@/features/metagame/use-metagame", () => metagameMocks);

const infiniteResult = (
  pages: FeedPostRow[][],
  extra: Record<string, unknown> = {},
) => ({
  data: { pages, pageParams: [null] },
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  fetchNextPage: vi.fn(async () => undefined),
  hasNextPage: false,
  isFetchingNextPage: false,
  ...extra,
});

const mutationResult = (
  mutateAsync: (args?: unknown) => Promise<unknown> = async () => ({
    ok: true,
    data: undefined,
  }),
) => ({ mutateAsync, mutate: vi.fn(), isPending: false });

function stubSocial() {
  mutationsMocks.useCreatePost.mockReturnValue(mutationResult());
  mutationsMocks.useUpdatePost.mockReturnValue(mutationResult());
  mutationsMocks.useDeletePost.mockReturnValue(mutationResult());
  mutationsMocks.useCreateComment.mockReturnValue(mutationResult());
  mutationsMocks.useDeleteComment.mockReturnValue(mutationResult());
  mutationsMocks.useCreateReport.mockReturnValue(mutationResult());
  mutationsMocks.useToggleLike.mockReturnValue(mutationResult());
  mutationsMocks.useToggleFollow.mockReturnValue(mutationResult());
  mutationsMocks.useToggleBlock.mockReturnValue(mutationResult());
  queriesMocks.useIsModerator.mockReturnValue({
    data: false,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  moderationMocks.useRemoveContent.mockReturnValue(mutationResult());
  groupsMocks.useMyGroups.mockReturnValue({
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  metagameMocks.useMetagameSnapshot.mockReturnValue({
    data: null,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
}

function postRow(overrides: Partial<FeedPostRow> = {}): FeedPostRow {
  return {
    id: "post-1",
    author_id: "user-2",
    body: "First post!",
    attachment: null,
    created_at: "2024-03-05T10:00:00Z",
    updated_at: "2024-03-05T10:00:00Z",
    author_username: "brock",
    author_display_name: "Brock",
    author_avatar_species: "Onix",
    like_count: 2,
    comment_count: 1,
    liked_by_me: false,
    group_id: null,
    ...overrides,
  };
}

function renderHome(auth = createFakeAuth()) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <AuthContext.Provider value={auth}>
            <HomePage />
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

describe("HomePage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    availabilityMocks.socialAvailability.mockReturnValue("not-configured");
    stubSocial();
  });

  it("shows the tools intro when the social layer is not ready", () => {
    renderHome();

    expect(
      screen.getByRole("link", { name: /damage calculator/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /team builder/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /metagame/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: /latest/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the feed with posts when ready", async () => {
    availabilityMocks.socialAvailability.mockReturnValue("ready");
    queriesMocks.useFeed.mockReturnValue(
      infiniteResult([[postRow({ id: "post-a", body: "Hello feed" })]]),
    );
    renderHome();

    expect(await screen.findByText("Hello feed")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /latest/i })).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /following/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Groups" })).toHaveAttribute(
      "href",
      "/groups",
    );
  });

  it("shows the composer for signed-in users when ready", async () => {
    availabilityMocks.socialAvailability.mockReturnValue("ready");
    queriesMocks.useFeed.mockReturnValue(infiniteResult([[]]));
    renderHome();

    expect(
      await screen.findByRole("textbox", { name: "Write a post" }),
    ).toBeInTheDocument();
  });

  it("hides the hero for signed-in users", async () => {
    availabilityMocks.socialAvailability.mockReturnValue("ready");
    queriesMocks.useFeed.mockReturnValue(infiniteResult([[]]));
    renderHome();

    // Wait for the feed to settle, then confirm no hero heading remains.
    await screen.findByRole("radio", { name: /latest/i });
    expect(
      screen.queryByRole("heading", { name: /ohko ?lab/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the compact intro for signed-out visitors", async () => {
    availabilityMocks.socialAvailability.mockReturnValue("ready");
    queriesMocks.useFeed.mockReturnValue(infiniteResult([[]]));
    renderHome(createFakeAuth({ user: null, session: null, profile: null }));

    expect(
      await screen.findByRole("heading", { name: /ohko ?lab/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /damage calculator/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /metagame/i })).toBeInTheDocument();
  });

  it("shows the sign-in prompt on the Following tab when signed out", async () => {
    availabilityMocks.socialAvailability.mockReturnValue("ready");
    queriesMocks.useFeed.mockReturnValue(infiniteResult([[]]));
    const user = userEvent.setup();
    renderHome(createFakeAuth({ user: null, session: null, profile: null }));

    await user.click(screen.getByRole("radio", { name: /following/i }));

    expect(
      await screen.findByText(/sign in to see posts from trainers you follow/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login?returnTo=/",
    );
  });

  it("shows the empty state when the feed has no posts", async () => {
    availabilityMocks.socialAvailability.mockReturnValue("ready");
    queriesMocks.useFeed.mockReturnValue(infiniteResult([[]]));
    renderHome();

    expect(
      await screen.findByText(/no posts yet/i),
    ).toBeInTheDocument();
  });

  it("shows an error with retry when the feed fails", async () => {
    availabilityMocks.socialAvailability.mockReturnValue("ready");
    queriesMocks.useFeed.mockReturnValue(
      infiniteResult([], {
        isError: true,
        error: {
          code: "network",
          message:
            "Could not reach the server. Check your connection and try again.",
        },
      }),
    );
    renderHome();

    expect(
      await screen.findByText(/could not load the feed/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/could not reach the server/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("loads more posts when the button is clicked", async () => {
    availabilityMocks.socialAvailability.mockReturnValue("ready");
    const fetchNextPage = vi.fn(async () => undefined);
    queriesMocks.useFeed.mockReturnValue(
      infiniteResult([[postRow({ id: "post-a", body: "Page one" })]], {
        fetchNextPage,
        hasNextPage: true,
      }),
    );
    const user = userEvent.setup();
    renderHome();

    // Assert page-1 content BEFORE fetchNextPage (tracked-props gotcha).
    expect(await screen.findByText("Page one")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => expect(fetchNextPage).toHaveBeenCalled());
  });
});
