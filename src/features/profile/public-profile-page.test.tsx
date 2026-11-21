import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import { createDefaultSet } from "@/data";
import { PublicProfilePage } from "@/features/profile/public-profile-page";
import { createFakeAuth, TEST_PROFILE } from "@/features/account/test-utils";
import { setLocale } from "@/lib/i18n/locale";
import { TEAMS_STORAGE_KEY } from "@/lib/team";
import type { AppSupabaseClient } from "@/lib/supabase";
import type {
  FeedPostRow,
  GroupMemberRow,
  GroupRow,
  ProfileRow,
  TeamRow,
} from "@/lib/database.types";
import type { Team } from "@/types/team";

const socialMocks = vi.hoisted(() => ({
  socialAvailability: vi.fn(() => "not-configured"),
  useFollowState: vi.fn(),
  useToggleFollow: vi.fn(),
  useFollowCounts: vi.fn(),
  useFollowers: vi.fn(),
  useFollowing: vi.fn(),
  useBlocks: vi.fn(),
  useToggleBlock: vi.fn(),
  useIsModerator: vi.fn(),
  useReports: vi.fn(),
  usePost: vi.fn(),
  useHandleReport: vi.fn(),
  useRemoveContent: vi.fn(),
  useSuspendUser: vi.fn(),
  useAuthorPosts: vi.fn(),
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

const queriesMocks = vi.hoisted(() => ({
  useFeed: vi.fn(),
  useAuthorPosts: vi.fn(),
  usePost: vi.fn(),
  useComments: vi.fn(),
  useIsModerator: vi.fn(),
}));

vi.mock("@/lib/social", () => socialMocks);
vi.mock("@/lib/social/mutations", () => mutationsMocks);
vi.mock("@/lib/social/moderation", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/social/moderation")>();
  return {
    ...actual,
    useSuspendUser: moderationMocks.useSuspendUser,
  };
});
vi.mock("@/lib/social/queries", () => queriesMocks);

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

function stubSocial(overrides: Partial<typeof socialMocks> = {}) {
  socialMocks.useFollowState.mockReturnValue(queryResult(false));
  socialMocks.useToggleFollow.mockReturnValue(mutationResult());
  socialMocks.useFollowCounts.mockReturnValue(
    queryResult({ followers: 0, following: 0 }),
  );
  socialMocks.useFollowers.mockReturnValue(queryResult([]));
  socialMocks.useFollowing.mockReturnValue(queryResult([]));
  socialMocks.useBlocks.mockReturnValue(queryResult([]));
  socialMocks.useToggleBlock.mockReturnValue(mutationResult());
  socialMocks.useAuthorPosts.mockReturnValue(infiniteResult([]));
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
  moderationMocks.useSuspendUser.mockReturnValue(mutationResult());
  socialMocks.useIsModerator.mockReturnValue(queryResult(false));
  queriesMocks.useIsModerator.mockReturnValue({
    data: false,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  Object.assign(socialMocks, overrides);
}

function profileRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: "user-1",
    username: "ashketchum",
    display_name: "Ash",
    avatar_species: "Pikachu",
    bio: "Pallet Town",
    main_format: null,
    looking_for: null,
    youtube_url: null,
    twitch_url: null,
    showdown_name: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function teamRow(overrides: Partial<TeamRow> = {}): TeamRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "user-1",
    name: "Champion team",
    data: [createDefaultSet("Garchomp"), createDefaultSet("Incineroar")],
    format: "doubles",
    is_public: true,
    game_team_id: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    ...overrides,
  };
}

function postRow(overrides: Partial<FeedPostRow> = {}): FeedPostRow {
  return {
    id: "post-1",
    author_id: "user-2",
    body: "First post!",
    attachment: null,
    created_at: "2024-03-05T10:00:00Z",
    updated_at: "2024-03-05T10:00:00Z",
    language: null,
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

function groupRow(overrides: Partial<GroupRow> = {}): GroupRow {
  return {
    id: "g1",
    slug: "vermilion-crew",
    name: "Vermilion Crew",
    description: "Surge's gym regulars.",
    visibility: "public",
    category: null,
    language: null,
    owner_id: "user-2",
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
    ...overrides,
  };
}

function memberRow(overrides: Partial<GroupMemberRow> = {}): GroupMemberRow {
  return {
    group_id: "g1",
    user_id: "user-1",
    role: "member",
    status: "active",
    created_at: "2024-02-02T00:00:00Z",
    ...overrides,
  };
}

type ProfileFetch = { data: ProfileRow | null; error: unknown };
type TeamsFetch = { data: TeamRow[]; error: unknown };
type MemberFetch = { data: GroupMemberRow[]; error: unknown };
type GroupsFetch = { data: GroupRow[]; error: unknown };

/**
 * A Supabase stand-in: `profiles` answers through `maybeSingle`, `teams`
 * through the eq/eq/order chain, `group_members` through eq/eq and `groups`
 * through in/order. Each chain counts its calls and answers with an error
 * while the call count is within the configured failure count, so a retry
 * (or a manual refetch) can succeed without flipping flags between calls.
 */
function createFakeClient(
  options: {
    profile?: ProfileRow | null;
    teams?: TeamRow[];
    memberRows?: GroupMemberRow[];
    groupRows?: GroupRow[];
    profileFailures?: number;
    teamsFailures?: number;
    memberFailures?: number;
    hangProfile?: boolean;
  } = {},
) {
  let profileCalls = 0;
  let teamsCalls = 0;
  let memberCalls = 0;
  const from = (table: string) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: (): Promise<ProfileFetch> => {
              profileCalls += 1;
              if (options.hangProfile) {
                return new Promise<ProfileFetch>(() => {});
              }
              if (profileCalls <= (options.profileFailures ?? 0)) {
                return Promise.resolve({
                  data: null,
                  error: { message: "network down" },
                });
              }
              return Promise.resolve({
                data: options.profile ?? null,
                error: null,
              });
            },
          }),
        }),
      };
    }
    if (table === "teams") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: (): Promise<TeamsFetch> => {
                teamsCalls += 1;
                if (teamsCalls <= (options.teamsFailures ?? 0)) {
                  return Promise.resolve({
                    data: [],
                    error: { message: "network down" },
                  });
                }
                return Promise.resolve({
                  data: options.teams ?? [],
                  error: null,
                });
              },
            }),
          }),
        }),
      };
    }
    if (table === "group_members") {
      return {
        select: () => ({
          eq: () => ({
            eq: (): Promise<MemberFetch> => {
              memberCalls += 1;
              if (memberCalls <= (options.memberFailures ?? 0)) {
                return Promise.resolve({
                  data: [],
                  error: { message: "network down" },
                });
              }
              return Promise.resolve({
                data: options.memberRows ?? [],
                error: null,
              });
            },
          }),
        }),
      };
    }
    if (table === "groups") {
      return {
        select: () => ({
          in: () => ({
            order: (): Promise<GroupsFetch> =>
              Promise.resolve({
                data: options.groupRows ?? [],
                error: null,
              }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  };
  return { from } as unknown as AppSupabaseClient;
}

function renderProfilePage(client: AppSupabaseClient | null, username: string) {
  const router = createMemoryRouter(
    [{ path: "/u/:username", element: <PublicProfilePage client={client} /> }],
    { initialEntries: [`/u/${username}`] },
  );
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("PublicProfilePage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    socialMocks.socialAvailability.mockReturnValue("not-configured");
  });

  it("shows a skeleton while the profile loads", async () => {
    renderProfilePage(createFakeClient({ hangProfile: true }), "pending");

    expect(
      screen.getByRole("heading", { name: "Profile" }),
    ).toBeInTheDocument();
    // The skeleton waits out the anti-flash delay, then announces itself.
    expect(
      await screen.findByRole("status", { name: "Loading profile" }),
    ).toBeVisible();
    expect(
      document.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);
  });

  it("says profiles are unavailable when Supabase is not configured", () => {
    renderProfilePage(null, "offline");

    expect(screen.getByText("Profiles are unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Profiles are not available in this build."),
    ).toBeInTheDocument();
  });

  it("says when the profile does not exist", async () => {
    renderProfilePage(createFakeClient({ profile: null }), "ghost");

    expect(await screen.findByText("Profile not found")).toBeInTheDocument();
    expect(screen.getByText("No one goes by @ghost here.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("offers a retry when the profile could not be loaded", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({
        id: "user-error",
        username: "erroru",
        display_name: "Red",
      }),
      profileFailures: 2,
    });
    renderProfilePage(client, "erroru");

    expect(
      await screen.findByText("Could not load profile", {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Something went wrong while loading this profile. Check your connection and try again.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findAllByText("Red")).toHaveLength(2);
  });

  it("shows the profile and their public teams", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({
        id: "user-misty",
        username: "misty",
        display_name: "Misty",
        bio: "Water Pokémon master.",
        created_at: "2024-03-05T00:00:00Z",
      }),
      teams: [teamRow({ id: "team-misty-1", user_id: "user-misty" })],
    });
    renderProfilePage(client, "misty");

    await user.click(await screen.findByRole("radio", { name: "Teams" }));

    expect(await screen.findByText("Champion team")).toBeInTheDocument();
    expect(screen.getAllByText("Misty")).toHaveLength(2);
    expect(screen.getAllByText("@misty")).toHaveLength(1);
    expect(screen.getByText("Water Pokémon master.")).toBeInTheDocument();
    expect(screen.getByText("Joined March 2024")).toBeInTheDocument();
    expect(await screen.findByAltText("Pikachu")).toBeInTheDocument();
    expect(screen.getByText(/Doubles · 2 Pokémon/)).toBeInTheDocument();
    // The team-member icons load lazily (they pull the Pokémon data layer).
    expect(
      await screen.findByRole("img", { name: "Garchomp" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Incineroar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
  });

  it("shows the profile's community fields", async () => {
    const client = createFakeClient({
      profile: profileRow({
        main_format: "both",
        looking_for: "team feedback",
        youtube_url: "https://youtube.com/@ash",
        showdown_name: "ashketchum",
      }),
    });
    renderProfilePage(client, "ashketchum");

    expect(await screen.findByText("Singles and doubles")).toBeInTheDocument();
    expect(screen.getByText("team feedback")).toBeInTheDocument();
    const youtube = screen.getByRole("link", { name: /YouTube/ });
    expect(youtube).toHaveAttribute("href", "https://youtube.com/@ash");
    expect(screen.getByText("ashketchum")).toBeInTheDocument();
  });

  it("renders no community rows for a bare profile", async () => {
    // Its own username: the query cache is shared across tests in the file.
    const client = createFakeClient({
      profile: profileRow({
        id: "user-duplica",
        username: "duplica",
        display_name: "Duplica",
      }),
    });
    renderProfilePage(client, "duplica");

    await screen.findByText("@duplica");
    expect(screen.queryByText(/Singles and doubles/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /YouTube/ }),
    ).not.toBeInTheDocument();
  });

  it("offers a retry when the teams could not be loaded", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({
        id: "user-brock",
        username: "brock",
        display_name: "Brock",
      }),
      teams: [teamRow({ id: "team-brock-1", user_id: "user-brock" })],
      teamsFailures: 2,
    });
    renderProfilePage(client, "brock");

    await user.click(await screen.findByRole("radio", { name: "Teams" }));

    expect(
      await screen.findByText("Could not load teams", {}, { timeout: 4000 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Champion team")).toBeInTheDocument();
  });

  it("shows a profile without an avatar or public teams", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({
        id: "user-tracey",
        username: "tracey",
        display_name: null,
        avatar_species: null,
        bio: null,
      }),
      teams: [],
    });
    renderProfilePage(client, "tracey");

    await user.click(await screen.findByRole("radio", { name: "Teams" }));

    expect(await screen.findByText("No public teams yet")).toBeInTheDocument();
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.getAllByText("tracey")).toHaveLength(2);
    expect(screen.getAllByText("@tracey")).toHaveLength(1);
  });

  it("copies a public team into the visitor's teams", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({
        id: "user-copy",
        username: "copyu",
        display_name: "Copy Cat",
      }),
      teams: [teamRow({ id: "team-copy-1", user_id: "user-copy" })],
    });
    renderProfilePage(client, "copyu");

    await user.click(await screen.findByRole("radio", { name: "Teams" }));
    await user.click(await screen.findByRole("button", { name: "View" }));

    expect(
      await screen.findByText(/Doubles · 2 Pokémon · shared by @copyu/),
    ).toBeInTheDocument();
    expect(await screen.findByText("Garchomp")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /copy to my teams/i }));

    expect(
      await screen.findByText(/Copied "Champion team" to your teams\./),
    ).toBeInTheDocument();

    const stored = JSON.parse(
      localStorage.getItem(TEAMS_STORAGE_KEY) ?? '{"version":1,"teams":[]}',
    ) as { version: number; teams: Team[] };
    expect(stored.teams).toHaveLength(1);
    const copied = stored.teams[0]!;
    expect(copied.id).not.toBe("11111111-1111-1111-1111-111111111111");
    expect(copied.name).toBe("Champion team");
    expect(copied.format).toBe("doubles");
    expect(copied.members.map((member) => member.species)).toEqual([
      "Garchomp",
      "Incineroar",
    ]);
  });

  it("lists the trainer's groups in the Groups tab", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({ id: "user-groups", username: "groupu" }),
      memberRows: [
        memberRow({ group_id: "g1", user_id: "user-groups" }),
        memberRow({ group_id: "g2", user_id: "user-groups" }),
      ],
      groupRows: [
        groupRow({ id: "g1", slug: "vermilion-crew", name: "Vermilion Crew" }),
        groupRow({
          id: "g2",
          slug: "celadon-circle",
          name: "Celadon Circle",
          visibility: "invite_only",
        }),
      ],
    });
    renderProfilePage(client, "groupu");

    await user.click(await screen.findByRole("radio", { name: "Groups" }));

    expect(await screen.findByText("Vermilion Crew")).toBeInTheDocument();
    expect(screen.getByText("Celadon Circle")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("Invite only")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Vermilion Crew/ }),
    ).toHaveAttribute("href", "/g/vermilion-crew");
    expect(
      screen.getByRole("link", { name: /Celadon Circle/ }),
    ).toHaveAttribute("href", "/g/celadon-circle");
  });

  it("shows an empty state when the trainer has no groups", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({ id: "user-nogroups", username: "loneu" }),
      memberRows: [],
    });
    renderProfilePage(client, "loneu");

    await user.click(await screen.findByRole("radio", { name: "Groups" }));

    expect(await screen.findByText("No groups yet")).toBeInTheDocument();
  });

  it("offers a retry when the groups could not be loaded", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({ id: "user-grouperr", username: "grouperr" }),
      memberRows: [memberRow({ user_id: "user-grouperr" })],
      groupRows: [groupRow()],
      memberFailures: 1,
    });
    renderProfilePage(client, "grouperr");

    await user.click(await screen.findByRole("radio", { name: "Groups" }));

    expect(
      await screen.findByText("Could not load groups"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Something went wrong while loading this trainer's groups. Check your connection and try again.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Vermilion Crew")).toBeInTheDocument();
  });

  it("tints the profile header with the avatar species' colour", async () => {
    renderProfilePage(
      createFakeClient({ profile: profileRow({ username: "tintu" }) }),
      "tintu",
    );

    expect(
      await screen.findByTestId("profile-banner-tint"),
    ).toBeInTheDocument();
  });

  it("leaves the header untinted without an avatar species", async () => {
    renderProfilePage(
      createFakeClient({
        profile: profileRow({ username: "plainu", avatar_species: null }),
      }),
      "plainu",
    );

    expect(await screen.findByText("Pallet Town")).toBeInTheDocument();
    expect(screen.queryByTestId("profile-banner-tint")).not.toBeInTheDocument();
  });
});

describe("PublicProfilePage social section", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    socialMocks.socialAvailability.mockReturnValue("ready");
    stubSocial();
  });

  function renderSignedIn(client: AppSupabaseClient, username: string) {
    const auth = createFakeAuth();
    const router = createMemoryRouter(
      [
        {
          path: "/u/:username",
          element: (
            <AuthContext.Provider value={auth}>
              <PublicProfilePage client={client} />
            </AuthContext.Provider>
          ),
        },
      ],
      { initialEntries: [`/u/${username}`] },
    );
    return render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    );
  }

  it("shows a sign-in link when signed out", async () => {
    const client = createFakeClient({
      profile: profileRow({ id: "user-guest", username: "guestu" }),
    });
    renderProfilePage(client, "guestu");

    const signIn = await screen.findByRole("link", {
      name: /sign in to follow/i,
    });
    expect(signIn).toHaveAttribute("href", "/login?returnTo=/u/guestu");
  });

  it("shows Follow when not following and toggles to Unfollow", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({ id: "user-2", username: "brock" }),
    });
    const mutateAsync = vi.fn(async () => ({
      ok: true,
      data: { following: true },
    }));
    stubSocial({
      useFollowState: vi.fn(() => queryResult(false)),
      useToggleFollow: vi.fn(() => ({
        mutateAsync,
        mutate: vi.fn(),
        isPending: false,
      })),
    });
    renderSignedIn(client, "brock");

    const followButton = await screen.findByRole("button", {
      name: /^follow$/i,
    });
    expect(followButton).toHaveTextContent("Follow");

    await user.click(followButton);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    // The toast uses the translated string, not a hard-coded sentence.
    expect(await screen.findByText("Following @brock.")).toBeInTheDocument();
  });

  it("shows Unfollow when already following", async () => {
    const client = createFakeClient({
      profile: profileRow({ id: "user-2", username: "brock" }),
    });
    stubSocial({
      useFollowState: vi.fn(() => queryResult(true)),
    });
    renderSignedIn(client, "brock");

    expect(
      await screen.findByRole("button", { name: /^unfollow$/i }),
    ).toBeInTheDocument();
  });

  it("hides the follow controls on your own profile", async () => {
    const client = createFakeClient({
      profile: profileRow({ id: TEST_PROFILE.id, username: "ashketchum" }),
    });
    renderSignedIn(client, "ashketchum");

    await screen.findByText("Pallet Town");
    expect(
      screen.queryByRole("button", { name: /^follow$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /more options/i }),
    ).not.toBeInTheDocument();
  });

  it("lists followers and following in dialogs", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({ id: "user-2", username: "brock" }),
    });
    stubSocial({
      useFollowCounts: vi.fn(() => queryResult({ followers: 2, following: 1 })),
      useFollowers: vi.fn(() =>
        queryResult([
          {
            id: "user-3",
            username: "misty",
            displayName: "Misty",
            avatarSpecies: "Staryu",
          },
          {
            id: "user-4",
            username: "tracey",
            displayName: null,
            avatarSpecies: null,
          },
        ]),
      ),
      useFollowing: vi.fn(() =>
        queryResult([
          {
            id: "user-5",
            username: "pikachu",
            displayName: "Pika",
            avatarSpecies: "Pikachu",
          },
        ]),
      ),
    });
    renderSignedIn(client, "brock");

    const followersButton = await screen.findByRole("button", {
      name: /2 followers/i,
    });
    expect(
      screen.getByRole("button", { name: /1 following/i }),
    ).toBeInTheDocument();

    await user.click(followersButton);

    expect(await screen.findByText("Misty")).toBeInTheDocument();
    expect(screen.getByText("@misty")).toBeInTheDocument();
    expect(screen.getByText("tracey")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /@misty/i })).toHaveAttribute(
      "href",
      "/u/misty",
    );
  });

  it("localises the follow counts in Japanese", async () => {
    setLocale("ja");
    const client = createFakeClient({
      profile: profileRow({ id: "user-2", username: "brock" }),
    });
    stubSocial({
      useFollowCounts: vi.fn(() => queryResult({ followers: 2, following: 1 })),
    });
    renderSignedIn(client, "brock");

    expect(
      await screen.findByRole("button", { name: /2 フォロワー/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /1 フォロー中/ }),
    ).toBeInTheDocument();

    setLocale("en");
  });

  it("shows empty text when there are no followers", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({ id: "user-2", username: "brock" }),
    });
    stubSocial({
      useFollowCounts: vi.fn(() => queryResult({ followers: 0, following: 0 })),
    });
    renderSignedIn(client, "brock");

    await user.click(
      await screen.findByRole("button", { name: /0 followers/i }),
    );

    expect(await screen.findByText(/no followers yet/i)).toBeInTheDocument();
  });

  it("shows an error with retry in the followers dialog when loading fails", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({ id: "user-2", username: "brock" }),
    });
    const refetch = vi.fn();
    stubSocial({
      useFollowCounts: vi.fn(() => queryResult({ followers: 1, following: 0 })),
      useFollowers: vi.fn(() =>
        queryResult([], {
          isError: true,
          error: { code: "unknown", message: "Something went wrong" },
          refetch,
        }),
      ),
    });
    renderSignedIn(client, "brock");

    await user.click(
      // One follower reads "1 follower", not "1 followers".
      await screen.findByRole("button", { name: /^1 follower$/i }),
    );

    expect(await screen.findByText(/could not load this list/i)).toBeVisible();
    expect(screen.queryByText(/no followers yet/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("blocks a user through the overflow menu and confirm dialog", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({ id: "user-2", username: "brock" }),
    });
    const mutateAsync = vi.fn(async () => ({
      ok: true,
      data: { blocked: true },
    }));
    stubSocial({
      useToggleBlock: vi.fn(() => ({
        mutateAsync,
        mutate: vi.fn(),
        isPending: false,
      })),
    });
    renderSignedIn(client, "brock");

    await screen.findByText("Pallet Town");
    await user.click(screen.getByRole("button", { name: /more options/i }));
    await user.click(await screen.findByRole("menuitem", { name: /block/i }));

    expect(
      screen.getByText(/Blocking works both ways: you won't see their posts/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/they won't see yours, and neither of you can follow/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/unblock them later from your account page/i),
    ).toBeInTheDocument();

    const confirm = await screen.findByRole("button", { name: /^block$/i });
    await user.click(confirm);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  });

  it("opens the report dialog from the overflow menu", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({ id: "user-2", username: "brock" }),
    });
    renderSignedIn(client, "brock");

    await screen.findByText("Pallet Town");
    await user.click(screen.getByRole("button", { name: /more options/i }));
    await user.click(
      await screen.findByRole("menuitem", { name: /report user/i }),
    );

    expect(
      await screen.findByRole("dialog", { name: /report/i }),
    ).toBeInTheDocument();
  });

  it("hides the suspend item from non-moderators", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({ id: "user-2", username: "brock" }),
    });
    renderSignedIn(client, "brock");

    await screen.findByText("Pallet Town");
    await user.click(screen.getByRole("button", { name: /more options/i }));

    expect(
      screen.queryByRole("menuitem", { name: /suspend user/i }),
    ).not.toBeInTheDocument();
  });

  it("offers moderators a suspend action", async () => {
    const user = userEvent.setup();
    const client = createFakeClient({
      profile: profileRow({ id: "user-2", username: "brock" }),
    });
    stubSocial({
      useIsModerator: vi.fn(() => queryResult(true)),
    });
    renderSignedIn(client, "brock");

    await screen.findByText("Pallet Town");
    await user.click(screen.getByRole("button", { name: /more options/i }));

    await user.click(
      await screen.findByRole("menuitem", { name: /suspend user/i }),
    );

    expect(
      await screen.findByRole("dialog", { name: /suspend/i }),
    ).toBeInTheDocument();
  });

  it("shows the trainer's posts", async () => {
    const client = createFakeClient({
      profile: profileRow({ id: "user-2", username: "posty" }),
    });
    socialMocks.useAuthorPosts.mockReturnValue(infiniteResult([[postRow()]]));
    renderSignedIn(client, "posty");

    expect(await screen.findByText("First post!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Brock" })).toBeInTheDocument();
    expect(socialMocks.useAuthorPosts).toHaveBeenCalledWith("user-2", client);
  });

  it("shows an empty state when the trainer has no posts", async () => {
    const client = createFakeClient({
      profile: profileRow({ id: "user-2", username: "posty" }),
    });
    renderSignedIn(client, "posty");

    expect(await screen.findByText("No posts yet")).toBeInTheDocument();
  });
});
