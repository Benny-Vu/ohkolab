import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import { createFakeAuth } from "@/features/account/test-utils";
import { PostList } from "@/features/feed/post-list";
import { postImageRow } from "@/lib/social/test-client";
import type { FeedPostRow } from "@/lib/database.types";

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

const queriesMocks = vi.hoisted(() => ({
  useFeed: vi.fn(),
  useAuthorPosts: vi.fn(),
  usePost: vi.fn(),
  useComments: vi.fn(),
  useIsModerator: vi.fn(),
}));

const moderationMocks = vi.hoisted(() => ({
  useRemoveContent: vi.fn(),
  useHandleReport: vi.fn(),
  useSuspendUser: vi.fn(),
}));

const imagesMocks = vi.hoisted(() => ({
  usePostImages: vi.fn(),
}));

vi.mock("@/lib/social/mutations", () => mutationsMocks);
vi.mock("@/lib/social/queries", () => queriesMocks);
vi.mock("@/lib/social/moderation", () => moderationMocks);
vi.mock("@/lib/social/images", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/social/images")>()),
  usePostImages: imagesMocks.usePostImages,
}));

const mutationResult = (
  mutateAsync: (args?: unknown) => Promise<unknown> = async () => ({
    ok: true,
    data: undefined,
  }),
) => ({ mutateAsync, mutate: vi.fn(), isPending: false });

const queryResult = (data: unknown, extra: Record<string, unknown> = {}) => ({
  data,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...extra,
});

function feedRow(
  id: string,
  overrides: Partial<FeedPostRow> = {},
): FeedPostRow {
  return {
    id,
    author_id: "user-2",
    body: `Post ${id}`,
    attachment: null,
    created_at: "2024-03-05T10:00:00Z",
    updated_at: "2024-03-05T10:00:00Z",
    author_username: "brock",
    author_display_name: "Brock",
    author_avatar_species: "Onix",
    like_count: 1,
    comment_count: 0,
    liked_by_me: false,
    group_id: null,
    ...overrides,
  };
}

function renderList(posts: FeedPostRow[]) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <AuthContext.Provider value={createFakeAuth()}>
            <PostList posts={posts} />
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

describe("PostList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(
      mutationsMocks,
    ) as (keyof typeof mutationsMocks)[]) {
      mutationsMocks[key].mockReturnValue(mutationResult());
    }
    queriesMocks.useIsModerator.mockReturnValue(queryResult(false));
    moderationMocks.useRemoveContent.mockReturnValue(mutationResult());
  });

  it("renders posts with their images in one batched query", () => {
    imagesMocks.usePostImages.mockReturnValue(
      queryResult([
        postImageRow({ id: "img-1", post_id: "post-1", alt: "Beach battle" }),
        postImageRow({ id: "img-2", post_id: "post-2", alt: null }),
      ]),
    );
    renderList([feedRow("post-1"), feedRow("post-2")]);

    // One batched query with every post's id; the cards add no queries
    // (their prop is set, so they ask for no ids of their own).
    const idCalls = imagesMocks.usePostImages.mock.calls
      .map((args) => args[0])
      .filter((ids: string[]) => ids.length > 0);
    expect(idCalls).toHaveLength(1);
    expect(idCalls[0]).toEqual(["post-1", "post-2"]);
    expect(screen.getByText("Post post-1")).toBeInTheDocument();
    expect(screen.getByText("Post post-2")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Beach battle" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Image 1" })).toBeInTheDocument();
  });

  it("shows the empty state when there are no posts", () => {
    imagesMocks.usePostImages.mockReturnValue(queryResult([]));
    renderList([]);

    expect(screen.getByText("No posts yet")).toBeInTheDocument();
  });

  it("shows a retryable images error per post while the posts stay", async () => {
    const refetch = vi.fn();
    imagesMocks.usePostImages.mockReturnValue(
      queryResult([], { isError: true, refetch }),
    );
    renderList([feedRow("post-1"), feedRow("post-2")]);

    // The posts themselves stay on the page.
    expect(screen.getByText("Post post-1")).toBeInTheDocument();
    expect(screen.getByText("Post post-2")).toBeInTheDocument();

    // Each post's images area announces the failed batch with a retry.
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    for (const alert of alerts) {
      expect(alert).toHaveTextContent("Couldn't load this post's images.");
    }
    await userEvent.click(
      screen.getAllByRole("button", { name: /try again/i })[0]!,
    );
    expect(refetch).toHaveBeenCalled();
  });
});
