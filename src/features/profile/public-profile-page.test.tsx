import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import { createDefaultSet } from "@/data";
import { PublicProfilePage } from "@/features/profile/public-profile-page";
import { createFakeAuth, TEST_PROFILE } from "@/features/account/test-utils";
import { TEAMS_STORAGE_KEY } from "@/lib/team";
import type { AppSupabaseClient } from "@/lib/supabase";
import type { ProfileRow, TeamRow } from "@/lib/database.types";
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
}));

vi.mock("@/lib/social", () => socialMocks);

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
  Object.assign(socialMocks, overrides);
}

function profileRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: "user-1",
    username: "ashketchum",
    display_name: "Ash",
    avatar_species: "Pikachu",
    bio: "Pallet Town",
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
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    ...overrides,
  };
}

type ProfileFetch = { data: ProfileRow | null; error: unknown };
type TeamsFetch = { data: TeamRow[]; error: unknown };

/**
 * A Supabase stand-in: `profiles` answers through `maybeSingle`, `teams`
 * through the eq/eq/order chain. Each chain counts its calls and answers
 * with an error while the call count is within the configured failure
 * count, so a retry (or a manual refetch) can succeed without flipping
 * flags between calls.
 */
function createFakeClient(
  options: {
    profile?: ProfileRow | null;
    teams?: TeamRow[];
    profileFailures?: number;
    teamsFailures?: number;
    hangProfile?: boolean;
  } = {},
) {
  let profileCalls = 0;
  let teamsCalls = 0;
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

  it("shows a skeleton while the profile loads", () => {
    renderProfilePage(createFakeClient({ hangProfile: true }), "pending");

    expect(
      screen.getByRole("heading", { name: "Profile" }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(2);
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

    expect(await screen.findByText("Red")).toBeInTheDocument();
  });

  it("shows the profile and their public teams", async () => {
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

    expect(await screen.findByText("Champion team")).toBeInTheDocument();
    expect(screen.getByText("Misty")).toBeInTheDocument();
    expect(screen.getAllByText("@misty")).toHaveLength(2);
    expect(screen.getByText("Water Pokémon master.")).toBeInTheDocument();
    expect(
      screen.getByText(
        `Joined ${new Date("2024-03-05T00:00:00Z").toLocaleDateString()}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Pikachu")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Public teams" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Doubles · 2 Pokémon/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Garchomp" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Incineroar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
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

    expect(
      await screen.findByText("Could not load teams", {}, { timeout: 4000 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Champion team")).toBeInTheDocument();
  });

  it("shows a profile without an avatar or public teams", async () => {
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

    expect(await screen.findByText("No public teams yet.")).toBeInTheDocument();
    expect(screen.getByText("No avatar")).toBeInTheDocument();
    expect(screen.getByText("tracey")).toBeInTheDocument();
    expect(screen.getAllByText("@tracey")).toHaveLength(2);
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

    const confirm = await screen.findByRole("button", { name: /^block$/i });
    await user.click(confirm);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  });

  it("shows the posts placeholder", async () => {
    const client = createFakeClient({
      profile: profileRow({ id: "user-2", username: "brock" }),
    });
    renderSignedIn(client, "brock");

    expect(
      await screen.findByTestId("profile-posts-placeholder"),
    ).toBeInTheDocument();
    expect(screen.getByText(/posts — coming soon/i)).toBeInTheDocument();
  });
});
