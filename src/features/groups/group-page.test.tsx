import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import { createFakeAuth, type FakeAuth } from "@/features/account/test-utils";
import { GroupPage } from "@/features/groups/group-page";
import type { FeedPostRow } from "@/lib/database.types";
import type {
  GroupMember,
  GroupSummary,
  MyGroupMembership,
} from "@/lib/groups/queries";

const queriesMocks = vi.hoisted(() => ({
  useGroupBySlug: vi.fn(),
  useMyGroupMembership: vi.fn(),
  useGroupMemberCount: vi.fn(),
  useGroupMembers: vi.fn(),
  useGroupFeed: vi.fn(),
}));

const mutationsMocks = vi.hoisted(() => ({
  useJoinGroup: vi.fn(),
  useLeaveGroup: vi.fn(),
  useAcceptInvite: vi.fn(),
  useDeclineInvite: vi.fn(),
  useInviteMember: vi.fn(),
  useSetMemberRole: vi.fn(),
  useRemoveMember: vi.fn(),
  useUpdateGroup: vi.fn(),
  useRemoveGroupPost: vi.fn(),
  useDeleteGroup: vi.fn(),
}));

vi.mock("@/lib/groups/queries", () => queriesMocks);
vi.mock("@/lib/groups/mutations", () => mutationsMocks);
vi.mock("@/lib/social/queries", () => ({
  useGroupFeed: queriesMocks.useGroupFeed,
}));
vi.mock("@/features/feed/composer", () => ({
  Composer: ({ groupId }: { groupId?: string | null }) => (
    <div data-testid="composer" data-group={groupId ?? "none"} />
  ),
}));
vi.mock("@/features/feed/post-card", () => ({
  PostCard: ({
    post,
    onRemoveFromGroup,
  }: {
    post: FeedPostRow;
    onRemoveFromGroup?: () => void;
  }) => (
    <article>
      <p>{post.body}</p>
      {onRemoveFromGroup && (
        <button type="button" onClick={onRemoveFromGroup}>
          Remove from group
        </button>
      )}
    </article>
  ),
}));

const queryResult = (data: unknown, extra: Record<string, unknown> = {}) => ({
  data,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...extra,
});

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

function groupSummary(overrides: Partial<GroupSummary> = {}): GroupSummary {
  return {
    id: "g1",
    slug: "elite-four-fans",
    name: "Elite Four Fans",
    description: "For fans of the Elite Four.",
    visibility: "public",
    category: null,
    language: null,
    ownerId: "user-9",
    createdAt: "2024-03-05T10:00:00Z",
    ...overrides,
  };
}

function membership(
  overrides: Partial<MyGroupMembership> = {},
): MyGroupMembership {
  return {
    role: "member",
    status: "active",
    createdAt: "2024-03-05T10:00:00Z",
    ...overrides,
  };
}

function member(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    userId: "user-2",
    role: "member",
    status: "active",
    joinedAt: "2024-03-05T10:00:00Z",
    profile: null,
    ...overrides,
  };
}

function postRow(overrides: Partial<FeedPostRow> = {}): FeedPostRow {
  return {
    id: "post-1",
    author_id: "user-2",
    body: "First group post!",
    attachment: null,
    created_at: "2024-03-05T10:00:00Z",
    updated_at: "2024-03-05T10:00:00Z",
    author_username: "brock",
    author_display_name: "Brock",
    author_avatar_species: "Onix",
    like_count: 1,
    comment_count: 0,
    liked_by_me: false,
    language: null,
    group_id: "g1",
    ...overrides,
  };
}

function stubQueries(
  group: GroupSummary | null,
  membershipData: MyGroupMembership | null,
) {
  queriesMocks.useGroupBySlug.mockReturnValue(queryResult(group));
  queriesMocks.useMyGroupMembership.mockReturnValue(
    queryResult(membershipData),
  );
  queriesMocks.useGroupMemberCount.mockReturnValue(queryResult(3));
  queriesMocks.useGroupMembers.mockReturnValue(queryResult([]));
  queriesMocks.useGroupFeed.mockReturnValue(infiniteResult([[]]));
}

function stubMutations() {
  mutationsMocks.useJoinGroup.mockReturnValue(mutationResult());
  mutationsMocks.useLeaveGroup.mockReturnValue(mutationResult());
  mutationsMocks.useAcceptInvite.mockReturnValue(mutationResult());
  mutationsMocks.useDeclineInvite.mockReturnValue(mutationResult());
  mutationsMocks.useInviteMember.mockReturnValue(mutationResult());
  mutationsMocks.useSetMemberRole.mockReturnValue(mutationResult());
  mutationsMocks.useRemoveMember.mockReturnValue(mutationResult());
  mutationsMocks.useUpdateGroup.mockReturnValue(mutationResult());
  mutationsMocks.useRemoveGroupPost.mockReturnValue(mutationResult());
  mutationsMocks.useDeleteGroup.mockReturnValue(mutationResult());
}

function renderGroupPage(
  auth: FakeAuth = createFakeAuth(),
  initialEntries: string[] = ["/g/elite-four-fans"],
) {
  const router = createMemoryRouter(
    [
      {
        path: "/g/:slug",
        element: (
          <AuthContext.Provider value={auth}>
            <GroupPage />
          </AuthContext.Provider>
        ),
      },
      {
        path: "/groups",
        element: <p>groups page</p>,
      },
      {
        path: "/login",
        element: <p>login page</p>,
      },
    ],
    { initialEntries },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("GroupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubQueries(groupSummary(), membership());
    stubMutations();
  });

  it("shows the group header with visibility and member count", () => {
    renderGroupPage();

    expect(screen.getByText("Elite Four Fans")).toBeInTheDocument();
    expect(screen.getByText("For fans of the Elite Four.")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText(/3 members/i)).toBeInTheDocument();
  });

  it("keeps the page frame with skeletons while the group loads", async () => {
    queriesMocks.useGroupBySlug.mockReturnValue(
      queryResult(undefined, { isPending: true }),
    );
    renderGroupPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Loading group" }),
    ).toBeInTheDocument();
    // The skeleton waits out the anti-flash delay before it appears.
    expect(await screen.findByLabelText("Loading group")).toBeInTheDocument();
  });

  it("shows the feed with the composer for active members", () => {
    queriesMocks.useGroupFeed.mockReturnValue(
      infiniteResult([[postRow({ body: "Hello group" })]]),
    );
    renderGroupPage();

    expect(screen.getByText("Hello group")).toBeInTheDocument();
    expect(screen.getByTestId("composer")).toHaveAttribute("data-group", "g1");
  });

  it("shows Join for a signed-in non-member of a public group", () => {
    stubQueries(groupSummary(), null);
    renderGroupPage();

    expect(screen.getByRole("button", { name: /join/i })).toBeInTheDocument();
    expect(screen.queryByTestId("composer")).not.toBeInTheDocument();
    expect(
      screen.getByText(/join this group to see the feed/i),
    ).toBeInTheDocument();
  });

  it("shows Leave for an active member", () => {
    renderGroupPage();

    expect(screen.getByRole("button", { name: /leave/i })).toBeInTheDocument();
  });

  it("hides Leave for the owner and shows the owner note", () => {
    stubQueries(
      groupSummary({ ownerId: "user-1" }),
      membership({ role: "owner" }),
    );
    renderGroupPage();

    expect(
      screen.queryByRole("button", { name: /leave/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("You own this group")).toBeInTheDocument();
  });

  it("shows the delete danger zone for the owner", async () => {
    stubQueries(
      groupSummary({ ownerId: "user-1" }),
      membership({ role: "owner" }),
    );
    const user = userEvent.setup();
    renderGroupPage();

    await user.click(screen.getByRole("radio", { name: /settings/i }));

    expect(screen.getByText("Danger zone")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete group/i }),
    ).toBeInTheDocument();
  });

  it("shows accept and decline for an invited user", () => {
    stubQueries(groupSummary(), membership({ status: "invited" }));
    renderGroupPage();

    expect(screen.getByText("Invited")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /decline/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("composer")).not.toBeInTheDocument();
  });

  it("shows a sign-in link for guests", () => {
    renderGroupPage(
      createFakeAuth({ user: null, session: null, profile: null }),
    );
    expect(
      screen.getByRole("link", { name: /sign in to join/i }),
    ).toBeInTheDocument();
  });

  it("shows only the header for invite-only groups to non-members", () => {
    stubQueries(groupSummary({ visibility: "invite_only" }), null);
    renderGroupPage();

    expect(screen.getAllByText("Invite only").length).toBeGreaterThan(0);
    expect(screen.getByText(/this group is invite-only/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /join/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("composer")).not.toBeInTheDocument();
  });

  it("shows the feed for an active member of an invite-only group", () => {
    stubQueries(groupSummary({ visibility: "invite_only" }), membership());
    renderGroupPage();

    expect(screen.getByTestId("composer")).toBeInTheDocument();
    expect(
      screen.queryByText(/this group is invite-only/i),
    ).not.toBeInTheDocument();
  });

  it("shows a not-found card when the group does not exist", () => {
    stubQueries(null, null);
    renderGroupPage();

    expect(
      screen.getByText(/this group does not exist or is not visible/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /browse groups/i }),
    ).toHaveAttribute("href", "/groups");
  });

  it("shows the members tab with roles", async () => {
    queriesMocks.useGroupMembers.mockReturnValue(
      queryResult([
        member({
          userId: "user-9",
          role: "owner",
          profile: {
            id: "user-9",
            username: "lance",
            displayName: "Lance",
            avatarSpecies: null,
          },
        }),
        member({
          userId: "user-2",
          role: "moderator",
          profile: {
            id: "user-2",
            username: "brock",
            displayName: "Brock",
            avatarSpecies: null,
          },
        }),
      ]),
    );
    const user = userEvent.setup();
    renderGroupPage();

    await user.click(screen.getByRole("radio", { name: /members/i }));

    expect(screen.getByText("Lance")).toBeInTheDocument();
    expect(screen.getByText("Brock")).toBeInTheDocument();
    expect(screen.getAllByText("Owner").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Moderator").length).toBeGreaterThan(0);
  });

  it("hides the settings tab from plain members", () => {
    renderGroupPage();

    expect(
      screen.queryByRole("radio", { name: /settings/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the settings tab for the owner", async () => {
    stubQueries(
      groupSummary({ ownerId: "user-1" }),
      membership({ role: "owner" }),
    );
    const user = userEvent.setup();
    renderGroupPage();

    await user.click(screen.getByRole("radio", { name: /settings/i }));

    expect(screen.getByText("Group settings")).toBeInTheDocument();
  });

  it("hides the invite form from plain members", async () => {
    const user = userEvent.setup();
    renderGroupPage();
    await user.click(screen.getByRole("radio", { name: /members/i }));

    expect(screen.queryByText("Invite a member")).not.toBeInTheDocument();
  });

  it("shows the invite form for moderators", async () => {
    stubQueries(groupSummary(), membership({ role: "moderator" }));
    const user = userEvent.setup();
    renderGroupPage();
    await user.click(screen.getByRole("radio", { name: /members/i }));

    expect(screen.getByText("Invite a member")).toBeInTheDocument();
  });

  it("hides Remove from group on posts for plain members", () => {
    queriesMocks.useGroupFeed.mockReturnValue(infiniteResult([[postRow()]]));
    renderGroupPage();

    expect(
      screen.queryByRole("button", { name: /remove from group/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Remove from group on posts for moderators", () => {
    stubQueries(groupSummary(), membership({ role: "moderator" }));
    queriesMocks.useGroupFeed.mockReturnValue(infiniteResult([[postRow()]]));
    renderGroupPage();

    expect(
      screen.getByRole("button", { name: /remove from group/i }),
    ).toBeInTheDocument();
  });

  it("asks for a reason and calls the remove_group_post mutation", async () => {
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useRemoveGroupPost.mockReturnValue(
      mutationResult(mutateAsync),
    );
    stubQueries(groupSummary(), membership({ role: "moderator" }));
    queriesMocks.useGroupFeed.mockReturnValue(infiniteResult([[postRow()]]));
    const user = userEvent.setup();
    renderGroupPage();

    await user.click(
      screen.getByRole("button", { name: /remove from group/i }),
    );

    expect(screen.getByText("Remove post from group")).toBeInTheDocument();
    const reason = screen.getByLabelText("Reason");
    await user.type(reason, "Spam.");
    await user.click(screen.getByRole("button", { name: /^remove post$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        postId: "post-1",
        reason: "Spam.",
      }),
    );
  });

  it("invites a member by username from the members tab", async () => {
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useInviteMember.mockReturnValue(mutationResult(mutateAsync));
    stubQueries(groupSummary(), membership({ role: "owner" }));
    const user = userEvent.setup();
    renderGroupPage();

    await user.click(screen.getByRole("radio", { name: /members/i }));
    const input = screen.getByLabelText("Username to invite");
    await user.type(input, "misty");
    await user.click(screen.getByRole("button", { name: /^invite$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        groupId: "g1",
        username: "misty",
      }),
    );
  });

  it("does not send a second invite while one is pending", async () => {
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useInviteMember.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: true,
    });
    stubQueries(groupSummary(), membership({ role: "owner" }));
    const user = userEvent.setup();
    renderGroupPage();

    await user.click(screen.getByRole("radio", { name: /members/i }));
    const input = screen.getByLabelText("Username to invite");
    expect(screen.getByRole("button", { name: /^invite$/i })).toBeDisabled();

    // Enter in the input must not bypass the disabled invite button.
    await user.type(input, "misty{Enter}");

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("shows role controls for the owner on other members", async () => {
    stubQueries(
      groupSummary({ ownerId: "user-1" }),
      membership({ role: "owner" }),
    );
    queriesMocks.useGroupMembers.mockReturnValue(
      queryResult([
        member({
          userId: "user-1",
          role: "owner",
          profile: {
            id: "user-1",
            username: "ashketchum",
            displayName: "Ash",
            avatarSpecies: null,
          },
        }),
        member({
          userId: "user-2",
          role: "member",
          profile: {
            id: "user-2",
            username: "brock",
            displayName: "Brock",
            avatarSpecies: null,
          },
        }),
      ]),
    );
    const user = userEvent.setup();
    renderGroupPage();

    await user.click(screen.getByRole("radio", { name: /members/i }));

    expect(
      screen.getByRole("button", { name: /make moderator/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^remove$/i }),
    ).toBeInTheDocument();
  });

  it("hides role controls from plain members", async () => {
    queriesMocks.useGroupMembers.mockReturnValue(
      queryResult([member({ userId: "user-2", role: "member" })]),
    );
    const user = userEvent.setup();
    renderGroupPage();

    await user.click(screen.getByRole("radio", { name: /members/i }));

    expect(
      screen.queryByRole("button", { name: /make moderator/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^remove$/i }),
    ).not.toBeInTheDocument();
  });

  it("saves settings from the owner's settings tab", async () => {
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useUpdateGroup.mockReturnValue(mutationResult(mutateAsync));
    stubQueries(
      groupSummary({ ownerId: "user-1" }),
      membership({ role: "owner" }),
    );
    const user = userEvent.setup();
    renderGroupPage();

    await user.click(screen.getByRole("radio", { name: /settings/i }));
    const name = screen.getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Elite Five");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        groupId: "g1",
        name: "Elite Five",
        description: "For fans of the Elite Four.",
        visibility: "public",
      }),
    );
  });

  it("keeps Delete group disabled until the slug is typed", async () => {
    stubQueries(
      groupSummary({ ownerId: "user-1" }),
      membership({ role: "owner" }),
    );
    const user = userEvent.setup();
    renderGroupPage();

    await user.click(screen.getByRole("radio", { name: /settings/i }));

    const deleteButton = screen.getByRole("button", { name: /delete group/i });
    expect(deleteButton).toBeDisabled();

    const confirm = screen.getByLabelText("Type the group address to confirm");
    await user.type(confirm, "elite-four");
    expect(deleteButton).toBeDisabled();

    await user.type(confirm, "-fans");
    expect(deleteButton).toBeEnabled();
  });

  it("deletes the group and navigates to /groups", async () => {
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useDeleteGroup.mockReturnValue(mutationResult(mutateAsync));
    stubQueries(
      groupSummary({ ownerId: "user-1" }),
      membership({ role: "owner" }),
    );
    const user = userEvent.setup();
    renderGroupPage();

    await user.click(screen.getByRole("radio", { name: /settings/i }));
    const confirm = screen.getByLabelText("Type the group address to confirm");
    await user.type(confirm, "elite-four-fans");
    await user.click(screen.getByRole("button", { name: /delete group/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        groupId: "g1",
        slug: "elite-four-fans",
      }),
    );
    await waitFor(() =>
      expect(screen.getByText("groups page")).toBeInTheDocument(),
    );
  });
});
