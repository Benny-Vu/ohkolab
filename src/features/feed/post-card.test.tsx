import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import { createFakeAuth, TEST_PROFILE } from "@/features/account/test-utils";
import { PostCard } from "@/features/feed/post-card";
import { TEAMS_STORAGE_KEY } from "@/lib/team";
import type { FeedPostRow } from "@/lib/database.types";
import type { Team } from "@/types/team";

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

vi.mock("@/lib/social/mutations", () => mutationsMocks);
vi.mock("@/lib/social/queries", () => queriesMocks);
vi.mock("@/lib/social/moderation", () => moderationMocks);

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
  queriesMocks.useIsModerator.mockReturnValue(queryResult(false));
  moderationMocks.useRemoveContent.mockReturnValue(mutationResult());
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

function renderCard(post: FeedPostRow, auth = createFakeAuth()) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <AuthContext.Provider value={auth}>
            <PostCard post={post} />
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

describe("PostCard", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    stubSocial();
  });

  it("renders the post with author, body and counts", () => {
    renderCard(postRow());

    expect(screen.getByText("First post!")).toBeInTheDocument();
    expect(screen.getByText("Brock")).toBeInTheDocument();
    expect(screen.getByText("@brock")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Onix" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /like/i })).toHaveTextContent(
      "2",
    );
    expect(screen.getByRole("button", { name: /^1 comment$/i })).not.toBeNull();
  });

  it("links to the author profile and post detail", () => {
    renderCard(postRow());

    expect(screen.getByRole("link", { name: "Brock" })).toHaveAttribute(
      "href",
      "/u/brock",
    );
    expect(
      screen.getByRole("button", { name: /^1 comment$/i }),
    ).toBeInTheDocument();
  });

  it("toggles a like", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useToggleLike.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    renderCard(postRow({ liked_by_me: true, like_count: 3 }));

    const likeButton = screen.getByRole("button", { name: /unlike/i });
    expect(likeButton).toHaveTextContent("3");

    await user.click(likeButton);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  });

  it("shows the team attachment with copy and calc actions", async () => {
    const user = userEvent.setup();
    const attachment = {
      kind: "team",
      name: "Champion team",
      format: "doubles",
      members: [
        {
          species: "Garchomp",
          item: null,
          ability: null,
          nature: "Adamant",
          statPoints: {
            hp: 0,
            atk: 0,
            def: 0,
            spa: 0,
            spd: 0,
            spe: 0,
          },
          moves: [null, null, null, null],
        },
      ],
    };
    renderCard(postRow({ attachment }));

    expect(screen.getByText("Champion team")).toBeInTheDocument();
    expect(screen.getByText("doubles")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Garchomp" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /copy to my teams/i }));

    const stored = JSON.parse(
      localStorage.getItem(TEAMS_STORAGE_KEY) ?? '{"version":1,"teams":[]}',
    ) as { version: number; teams: Team[] };
    expect(stored.teams).toHaveLength(1);
    expect(stored.teams[0]!.name).toBe("Champion team");
  });

  it("edits an own post through the overflow menu", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useUpdatePost.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    renderCard(
      postRow({ author_id: TEST_PROFILE.id, author_username: "ashketchum" }),
    );

    await user.click(screen.getByRole("button", { name: /post options/i }));
    await user.click(await screen.findByRole("menuitem", { name: /edit/i }));

    const textarea = screen.getByRole("textbox", { name: "Edit post" });
    await user.clear(textarea);
    await user.type(textarea, "Edited body");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        postId: "post-1",
        body: "Edited body",
      }),
    );
  });

  it("deletes an own post through the confirm dialog", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useDeletePost.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    renderCard(
      postRow({ author_id: TEST_PROFILE.id, author_username: "ashketchum" }),
    );

    await user.click(screen.getByRole("button", { name: /post options/i }));
    await user.click(await screen.findByRole("menuitem", { name: /delete/i }));

    await user.click(await screen.findByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith("post-1"));
  });

  it("reports someone else's post", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useCreateReport.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    renderCard(postRow());

    await user.click(screen.getByRole("button", { name: /post options/i }));
    await user.click(await screen.findByRole("menuitem", { name: /report/i }));

    await user.click(screen.getByRole("combobox", { name: "Report reason" }));
    await user.click(await screen.findByRole("option", { name: "Spam" }));
    await user.click(
      await screen.findByRole("button", { name: /submit report/i }),
    );

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        targetType: "post",
        targetId: "post-1",
        reason: "spam",
        details: undefined,
      }),
    );
  });

  it("blocks the author through the confirm dialog", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useToggleBlock.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    renderCard(postRow());

    await user.click(screen.getByRole("button", { name: /post options/i }));
    await user.click(await screen.findByRole("menuitem", { name: /block/i }));

    await user.click(await screen.findByRole("button", { name: /^block$/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  });

  it("offers remove for moderators on other users' posts", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    moderationMocks.useRemoveContent.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    queriesMocks.useIsModerator.mockReturnValue(queryResult(true));

    renderCard(postRow());

    await user.click(screen.getByRole("button", { name: /post options/i }));
    await user.click(await screen.findByRole("menuitem", { name: /remove/i }));

    const reason = await screen.findByPlaceholderText(
      /reason for the removal/i,
    );
    await user.type(reason, "Spam links");

    await user.click(screen.getByRole("button", { name: /remove post/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        type: "post",
        id: "post-1",
        reason: "Spam links",
      }),
    );
  });
});
