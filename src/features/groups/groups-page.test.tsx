import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import { createFakeAuth, type FakeAuth } from "@/features/account/test-utils";
import { GroupsPage } from "@/features/groups/groups-page";
import type { DiscoverGroup } from "@/lib/groups/queries";

const queriesMocks = vi.hoisted(() => ({
  useMyGroups: vi.fn(),
  useDiscoverGroups: vi.fn(),
}));

const mutationsMocks = vi.hoisted(() => ({
  useJoinGroup: vi.fn(),
}));

vi.mock("@/lib/groups/queries", () => queriesMocks);
vi.mock("@/lib/groups/mutations", () => mutationsMocks);

function discoverGroup(overrides: Partial<DiscoverGroup> = {}): DiscoverGroup {
  return {
    id: "g1",
    slug: "elite-four-fans",
    name: "Elite Four Fans",
    description: "For fans of the Elite Four.",
    visibility: "public",
    category: null,
    language: null,
    ownerId: "user-1",
    createdAt: "2024-03-05T10:00:00Z",
    memberCount: 3,
    ...overrides,
  };
}

const listResult = (
  groups: DiscoverGroup[],
  extra: Record<string, unknown> = {},
) => ({
  data: groups,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  isFetching: false,
  ...extra,
});

const mutationResult = (
  mutateAsync: (args?: unknown) => Promise<unknown> = async () => ({
    ok: true,
    data: undefined,
  }),
) => ({ mutateAsync, mutate: vi.fn(), isPending: false });

function renderGroupsPage(
  auth: FakeAuth = createFakeAuth(),
  initialEntries: string[] = ["/groups"],
) {
  const router = createMemoryRouter(
    [
      {
        path: "/groups",
        element: (
          <AuthContext.Provider value={auth}>
            <GroupsPage />
          </AuthContext.Provider>
        ),
      },
      {
        path: "/groups/new",
        element: <p>new group page</p>,
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

describe("GroupsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queriesMocks.useMyGroups.mockReturnValue(listResult([]));
    queriesMocks.useDiscoverGroups.mockReturnValue(listResult([]));
    mutationsMocks.useJoinGroup.mockReturnValue(mutationResult());
  });

  it("shows the My groups tab first for signed-in users", () => {
    renderGroupsPage();

    expect(screen.getByRole("radio", { name: "My groups" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("lists the user's groups on My groups", () => {
    queriesMocks.useMyGroups.mockReturnValue(
      listResult([
        discoverGroup({
          id: "g1",
          slug: "elite-four-fans",
          name: "Elite Four Fans",
        }),
        discoverGroup({
          id: "g2",
          slug: "doubles-lab",
          name: "Doubles Lab",
          visibility: "invite_only",
          memberCount: 0,
        }),
      ]),
    );
    renderGroupsPage();

    expect(screen.getByText("Elite Four Fans")).toBeInTheDocument();
    expect(screen.getByText("Doubles Lab")).toBeInTheDocument();
    expect(screen.getByText("Invite only")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /elite four fans/i }),
    ).toHaveAttribute("href", "/g/elite-four-fans");
  });

  it("shows the create button for signed-in users", () => {
    renderGroupsPage();

    expect(screen.getByRole("link", { name: /create group/i })).toHaveAttribute(
      "href",
      "/groups/new",
    );
  });

  it("hides the create button for guests", () => {
    renderGroupsPage(
      createFakeAuth({ user: null, session: null, profile: null }),
    );

    expect(
      screen.queryByRole("link", { name: /create group/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the empty state when the user has no groups", () => {
    renderGroupsPage();

    expect(
      screen.getByText(/you have not joined any groups yet/i),
    ).toBeInTheDocument();
  });

  it("shows the empty state while the discovery query fails", async () => {
    const refetch = vi.fn().mockResolvedValue({ undefined });
    queriesMocks.useDiscoverGroups.mockReturnValue(
      listResult([], {
        isError: true,
        error: { code: "unknown", message: "Something went wrong" },
        refetch,
      }),
    );
    const user = userEvent.setup();
    renderGroupsPage();

    await user.click(screen.getByRole("radio", { name: /discover/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not load groups/i,
    );
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("shows skeletons while groups load", async () => {
    queriesMocks.useMyGroups.mockReturnValue(
      listResult([], { isPending: true }),
    );
    renderGroupsPage();

    // The skeleton waits out the anti-flash delay before it appears.
    expect(await screen.findByLabelText("Loading groups")).toBeInTheDocument();
  });

  it("shows an error state with a retry when My groups fails", async () => {
    const refetch = vi.fn().mockResolvedValue({ undefined });
    queriesMocks.useMyGroups.mockReturnValue(
      listResult([], {
        isError: true,
        error: { code: "unknown", message: "Something went wrong" },
        refetch,
      }),
    );
    const user = userEvent.setup();
    renderGroupsPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      /could not load groups/i,
    );

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(refetch).toHaveBeenCalled();
  });
});

describe("GroupsPage discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queriesMocks.useMyGroups.mockReturnValue(listResult([]));
    queriesMocks.useDiscoverGroups.mockReturnValue(listResult([]));
    mutationsMocks.useJoinGroup.mockReturnValue(mutationResult());
  });

  async function openDiscover() {
    const user = userEvent.setup();
    renderGroupsPage();
    await user.click(screen.getByRole("radio", { name: /discover/i }));
    return user;
  }

  it("lists public groups with their member counts and badges", async () => {
    queriesMocks.useDiscoverGroups.mockReturnValue(
      listResult([
        discoverGroup({
          id: "g1",
          slug: "doubles-lab",
          name: "Doubles Lab",
          category: "doubles",
          language: "ja",
          memberCount: 2,
        }),
      ]),
    );
    await openDiscover();

    expect(
      await screen.findByRole("link", { name: /doubles lab/i }),
    ).toHaveAttribute("href", "/g/doubles-lab");
    expect(screen.getByText("2 members")).toBeInTheDocument();
    expect(screen.getByText("Doubles")).toBeInTheDocument();
    expect(screen.getByText("Japanese")).toBeInTheDocument();
  });

  it("sorts by member count on Popular and by date on New", async () => {
    queriesMocks.useDiscoverGroups.mockReturnValue(
      listResult([
        discoverGroup({
          id: "old-big",
          slug: "old-big",
          name: "Old Big",
          memberCount: 9,
          createdAt: "2026-01-01T00:00:00Z",
        }),
        discoverGroup({
          id: "new-small",
          slug: "new-small",
          name: "New Small",
          memberCount: 1,
          createdAt: "2026-11-01T00:00:00Z",
        }),
      ]),
    );
    const user = await openDiscover();

    const popular = await screen.findAllByRole("link", {
      name: /(old big|new small)/i,
    });
    expect(popular[0]).toHaveTextContent("Old Big");

    await user.click(screen.getByRole("radio", { name: /new/i }));

    const fresh = screen.getAllByRole("link", {
      name: /(old big|new small)/i,
    });
    expect(fresh[0]).toHaveTextContent("New Small");
  });

  it("filters by search on name and address", async () => {
    queriesMocks.useDiscoverGroups.mockReturnValue(
      listResult([
        discoverGroup({
          id: "g1",
          slug: "doubles-lab",
          name: "Doubles Lab",
        }),
        discoverGroup({
          id: "g2",
          slug: "kanto-club",
          name: "Kanto Club",
        }),
      ]),
    );
    const user = await openDiscover();

    const search = await screen.findByRole("searchbox", {
      name: /search groups by name or address/i,
    });
    await user.type(search, "kanto");

    await waitFor(() => {
      expect(screen.getByText("Kanto Club")).toBeInTheDocument();
      expect(screen.queryByText("Doubles Lab")).not.toBeInTheDocument();
    });
  });

  it("filters by category and language", async () => {
    queriesMocks.useDiscoverGroups.mockReturnValue(
      listResult([
        discoverGroup({
          id: "g1",
          slug: "doubles-lab",
          name: "Doubles Lab",
          category: "doubles",
          language: "en",
        }),
        discoverGroup({
          id: "g2",
          slug: "kanto-club",
          name: "Kanto Club",
          category: "regional",
          language: "ja",
        }),
      ]),
    );
    const user = await openDiscover();
    await screen.findByText("Doubles Lab");

    await user.click(screen.getByRole("combobox", { name: /category/i }));
    await user.click(await screen.findByRole("option", { name: "Regional" }));

    await waitFor(() => {
      expect(screen.getByText("Kanto Club")).toBeInTheDocument();
      expect(screen.queryByText("Doubles Lab")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("combobox", { name: /^language/i }));
    await user.click(await screen.findByRole("option", { name: "English" }));

    await waitFor(() => {
      expect(screen.queryByText("Kanto Club")).not.toBeInTheDocument();
    });
    expect(
      screen.getByText(/no groups match these filters/i),
    ).toBeInTheDocument();
  });

  it("shows a search-specific empty message when nothing matches", async () => {
    queriesMocks.useDiscoverGroups.mockReturnValue(
      listResult([discoverGroup({ name: "Doubles Lab" })]),
    );
    const user = await openDiscover();
    const search = await screen.findByRole("searchbox", {
      name: /search groups by name or address/i,
    });
    await user.type(search, "zzz");

    expect(
      await screen.findByText(/no groups match "zzz"/i),
    ).toBeInTheDocument();
  });

  it("joins a public group from the list", async () => {
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useJoinGroup.mockReturnValue(mutationResult(mutateAsync));
    queriesMocks.useDiscoverGroups.mockReturnValue(
      listResult([discoverGroup({ id: "g9", name: "Doubles Lab" })]),
    );
    const user = await openDiscover();

    await user.click(await screen.findByRole("button", { name: /^join$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ groupId: "g9" }),
    );
  });

  it("hides the Join button for groups the user already belongs to", async () => {
    queriesMocks.useMyGroups.mockReturnValue(
      listResult([discoverGroup({ id: "g9", name: "Doubles Lab" })]),
    );
    queriesMocks.useDiscoverGroups.mockReturnValue(
      listResult([discoverGroup({ id: "g9", name: "Doubles Lab" })]),
    );
    await openDiscover();

    expect(
      await screen.findByRole("link", { name: /doubles lab/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^join$/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the Join button for guests", async () => {
    queriesMocks.useDiscoverGroups.mockReturnValue(
      listResult([discoverGroup({ id: "g9", name: "Doubles Lab" })]),
    );
    const user = userEvent.setup();
    renderGroupsPage(
      createFakeAuth({ user: null, session: null, profile: null }),
    );
    await user.click(screen.getByRole("radio", { name: /discover/i }));

    expect(
      await screen.findByRole("link", { name: /doubles lab/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^join$/i }),
    ).not.toBeInTheDocument();
  });
});
