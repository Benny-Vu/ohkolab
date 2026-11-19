import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import { createFakeAuth, TEST_PROFILE } from "@/features/account/test-utils";
import { PostDetailPage } from "@/features/post/post-detail-page";
import type { FeedPostRow } from "@/lib/database.types";
import type { SocialComment } from "@/lib/social/queries";

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

const imagesMocks = vi.hoisted(() => ({
  usePostImages: vi.fn(),
}));

vi.mock("@/lib/social/queries", () => queriesMocks);
vi.mock("@/lib/social/mutations", () => mutationsMocks);
vi.mock("@/lib/social/moderation", () => moderationMocks);
vi.mock("@/lib/social/images", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/social/images")>()),
  usePostImages: imagesMocks.usePostImages,
}));

const queryResult = (data: unknown, extra: Record<string, unknown> = {}) => ({
  data,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...extra,
});

const mutationResult = (
  mutateAsync: (args?: unknown) => Promise<unknown> = async () => ({
    ok: true,
    data: undefined,
  }),
) => ({ mutateAsync, mutate: vi.fn(), isPending: false });

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

function commentRow(overrides: Partial<SocialComment> = {}): SocialComment {
  return {
    id: "comment-1",
    postId: "post-1",
    authorId: "user-2",
    body: "Nice team!",
    createdAt: "2024-03-05T11:00:00Z",
    author: {
      id: "user-2",
      username: "brock",
      displayName: "Brock",
      avatarSpecies: "Onix",
    },
    ...overrides,
  };
}

function stubSocial() {
  queriesMocks.usePost.mockReturnValue(queryResult(postRow()));
  queriesMocks.useComments.mockReturnValue(queryResult([commentRow()]));
  queriesMocks.useIsModerator.mockReturnValue(queryResult(false));
  mutationsMocks.useCreatePost.mockReturnValue(mutationResult());
  mutationsMocks.useUpdatePost.mockReturnValue(mutationResult());
  mutationsMocks.useDeletePost.mockReturnValue(mutationResult());
  mutationsMocks.useCreateComment.mockReturnValue(mutationResult());
  mutationsMocks.useDeleteComment.mockReturnValue(mutationResult());
  mutationsMocks.useCreateReport.mockReturnValue(mutationResult());
  mutationsMocks.useToggleLike.mockReturnValue(mutationResult());
  mutationsMocks.useToggleFollow.mockReturnValue(mutationResult());
  mutationsMocks.useToggleBlock.mockReturnValue(mutationResult());
  moderationMocks.useRemoveContent.mockReturnValue(mutationResult());
  imagesMocks.usePostImages.mockReturnValue(queryResult([]));
}

function renderPostPage(postId = "post-1", auth = createFakeAuth()) {
  const router = createMemoryRouter(
    [
      {
        path: "/post/:postId",
        element: (
          <AuthContext.Provider value={auth}>
            <PostDetailPage />
          </AuthContext.Provider>
        ),
      },
    ],
    { initialEntries: [`/post/${postId}`] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("PostDetailPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    stubSocial();
  });

  it("shows the post and its comments", async () => {
    renderPostPage();

    expect(await screen.findByText("First post!")).toBeInTheDocument();
    expect(screen.getByText("Nice team!")).toBeInTheDocument();
    expect(screen.getAllByText("Brock")).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: /^1 comment$/i }),
    ).not.toBeInTheDocument();
  });

  it("shows NotFound when the post does not exist", async () => {
    queriesMocks.usePost.mockReturnValue(queryResult(null));
    renderPostPage();

    expect(
      await screen.findByRole("heading", { name: /page not found/i }),
    ).toBeInTheDocument();
  });

  it("shows a sign-in prompt instead of the comment composer when signed out", async () => {
    renderPostPage(
      "post-1",
      createFakeAuth({ user: null, session: null, profile: null }),
    );

    expect(
      await screen.findByText(/to join the conversation/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login?returnTo=/post/post-1",
    );
  });

  it("shows a comments error with a retry button instead of an empty thread", async () => {
    const refetch = vi.fn();
    queriesMocks.useComments.mockReturnValue(
      queryResult([], {
        isError: true,
        error: { code: "unknown", message: "Something went wrong" },
        refetch,
      }),
    );
    renderPostPage();

    expect(
      await screen.findByText("Could not load comments"),
    ).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("No comments yet")).not.toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("posts a comment", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useCreateComment.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    renderPostPage();

    await user.type(
      screen.getByRole("textbox", { name: "Write a comment" }),
      "Great post",
    );
    await user.click(screen.getByRole("button", { name: /^comment$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        postId: "post-1",
        body: "Great post",
      }),
    );
  });

  it("deletes an own comment", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useDeleteComment.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    queriesMocks.useComments.mockReturnValue(
      queryResult([
        commentRow({
          authorId: TEST_PROFILE.id,
          author: {
            id: TEST_PROFILE.id,
            username: "ashketchum",
            displayName: "Ash",
            avatarSpecies: "Pikachu",
          },
        }),
      ]),
    );
    renderPostPage();

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        commentId: "comment-1",
        postId: "post-1",
      }),
    );

    // The deleted row's button disappears; focus moves to the section
    // heading so keyboard users do not land on the page body.
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /comments/i })).toHaveFocus(),
    );
  });

  it("reports someone else's comment", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useCreateReport.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    renderPostPage();

    await user.click(screen.getByRole("button", { name: /report/i }));

    await user.click(screen.getByRole("combobox", { name: "Report reason" }));
    await user.click(await screen.findByRole("option", { name: "Spam" }));
    await user.click(
      await screen.findByRole("button", { name: /submit report/i }),
    );

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        targetType: "comment",
        targetId: "comment-1",
        reason: "spam",
        details: undefined,
      }),
    );
  });

  it("shows the author their pending image notice", async () => {
    queriesMocks.usePost.mockReturnValue(
      queryResult(postRow({ author_id: TEST_PROFILE.id })),
    );
    imagesMocks.usePostImages.mockReturnValue(
      queryResult([
        {
          id: "img-1",
          post_id: "post-1",
          author_id: TEST_PROFILE.id,
          position: 0,
          pending_path: "user-1/post-1/img-1.webp",
          public_path: null,
          width: 1600,
          height: 900,
          bytes: 1000,
          status: "pending",
          screen_result: null,
          screened_at: null,
          alt: null,
          created_at: "2026-11-19T10:00:00.000Z",
        },
      ]),
    );
    renderPostPage();

    expect(await screen.findByText("Checking image…")).toBeInTheDocument();
  });

  it("shows a retryable images error while the post stays", async () => {
    const refetch = vi.fn();
    imagesMocks.usePostImages.mockReturnValue(
      queryResult([], { isError: true, refetch }),
    );
    renderPostPage();

    // The post itself stays; the images area offers a retry.
    expect(await screen.findByText("First post!")).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load this post's images.");
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
