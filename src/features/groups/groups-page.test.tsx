import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import { createFakeAuth, type FakeAuth } from "@/features/account/test-utils";
import { GroupsPage } from "@/features/groups/groups-page";
import type { GroupSummary } from "@/lib/groups/queries";

const queriesMocks = vi.hoisted(() => ({
  useMyGroups: vi.fn(),
  usePublicGroups: vi.fn(),
}));

vi.mock("@/lib/groups/queries", () => queriesMocks);

function groupSummary(overrides: Partial<GroupSummary> = {}): GroupSummary {
  return {
    id: "g1",
    slug: "elite-four-fans",
    name: "Elite Four Fans",
    description: "For fans of the Elite Four.",
    visibility: "public",
    ownerId: "user-1",
    createdAt: "2024-03-05T10:00:00Z",
    ...overrides,
  };
}

const listResult = (
  groups: GroupSummary[],
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
    queriesMocks.usePublicGroups.mockReturnValue(listResult([]));
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
        groupSummary({
          id: "g1",
          slug: "elite-four-fans",
          name: "Elite Four Fans",
        }),
        groupSummary({
          id: "g2",
          slug: "doubles-lab",
          name: "Doubles Lab",
          visibility: "invite_only",
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

  it("hides the create button and shows a sign-in prompt for guests", () => {
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

  it("shows the Discover tab with public groups and search", async () => {
    queriesMocks.usePublicGroups.mockReturnValue(
      listResult([groupSummary({ name: "Doubles Lab" })]),
    );
    const user = userEvent.setup();
    renderGroupsPage();

    await user.click(screen.getByRole("radio", { name: /discover/i }));

    expect(
      await screen.findByRole("searchbox", { name: /search groups by name/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Doubles Lab")).toBeInTheDocument();
  });

  it("passes the search term to the public groups query", async () => {
    queriesMocks.usePublicGroups.mockReturnValue(listResult([]));
    const user = userEvent.setup();
    renderGroupsPage();

    await user.click(screen.getByRole("radio", { name: /discover/i }));
    const search = await screen.findByRole("searchbox", {
      name: /search groups by name/i,
    });
    await user.type(search, "doubles");

    await waitFor(() =>
      expect(queriesMocks.usePublicGroups).toHaveBeenLastCalledWith("doubles"),
    );
  });

  it("shows a search-specific empty message when nothing matches", async () => {
    queriesMocks.usePublicGroups.mockReturnValue(listResult([]));
    const user = userEvent.setup();
    renderGroupsPage();

    await user.click(screen.getByRole("radio", { name: /discover/i }));
    const search = await screen.findByRole("searchbox", {
      name: /search groups by name/i,
    });
    await user.type(search, "zzz");

    expect(
      await screen.findByText(/no groups match "zzz"/i),
    ).toBeInTheDocument();
  });

  it("shows skeletons while groups load", () => {
    queriesMocks.useMyGroups.mockReturnValue(
      listResult([], { isPending: true }),
    );
    renderGroupsPage();

    expect(screen.getByLabelText("Loading groups")).toBeInTheDocument();
  });
});
