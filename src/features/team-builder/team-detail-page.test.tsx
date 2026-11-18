import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Providers } from "@/app/providers";
import { createFakeAuth } from "@/features/account/test-utils";
import { TeamsPage } from "@/features/team-builder/teams-page";
import { TeamDetailPage } from "@/features/team-builder/team-detail-page";
import { AuthContext, GUEST_AUTH } from "@/lib/auth/use-auth";
import type { AuthContextValue } from "@/lib/auth/types";
import type { TeamRow } from "@/lib/database.types";
import { createDefaultSet } from "@/data";
import { setLocale } from "@/lib/i18n/locale";
import { setTeamsSyncClient } from "@/lib/team/active-store";
import { createTeam } from "@/lib/team/team-ops";
import { localTeamStore } from "@/lib/team/team-store";
import type { AppSupabaseClient } from "@/lib/supabase";

type LoadResult = { data: TeamRow[] | null; error: { message: string } | null };

function row(partial: Partial<TeamRow> & Pick<TeamRow, "id">): TeamRow {
  return {
    user_id: "user-1",
    name: "Test team",
    data: [],
    format: "doubles",
    is_public: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function createFakeClient(
  options: { rows?: TeamRow[]; loadError?: { message: string } } = {},
) {
  const calls = { upserts: [] as unknown[] };
  let loadResult: LoadResult = options.loadError
    ? { data: null, error: options.loadError }
    : { data: options.rows ?? [], error: null };
  const client = {
    from() {
      return {
        select() {
          return {
            eq() {
              return Promise.resolve(loadResult);
            },
          };
        },
        upsert(payload: unknown) {
          calls.upserts.push(payload);
          return Promise.resolve({ error: null });
        },
        delete() {
          return {
            eq() {
              return Promise.resolve({ error: null });
            },
          };
        },
        insert() {
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as AppSupabaseClient;
  return {
    client,
    calls,
    setLoadResult(result: LoadResult) {
      loadResult = result;
    },
  };
}

function createPendingClient() {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return new Promise(() => {});
            },
          };
        },
        upsert() {
          return Promise.resolve({ error: null });
        },
        delete() {
          return {
            eq() {
              return Promise.resolve({ error: null });
            },
          };
        },
        insert() {
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as AppSupabaseClient;
}

function renderTeamRoutes(auth: AuthContextValue, initialEntries: string[]) {
  const router = createMemoryRouter(
    [
      { path: "/teams", element: <TeamsPage /> },
      { path: "/teams/:teamId", element: <TeamDetailPage /> },
    ],
    { initialEntries },
  );
  render(
    <Providers>
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </Providers>,
  );
  return router;
}

describe("TeamDetailPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    setTeamsSyncClient(null);
  });

  it("shows a loading state while teams load", () => {
    setTeamsSyncClient(createPendingClient());
    renderTeamRoutes(createFakeAuth(), ["/teams/t-1"]);

    expect(screen.getAllByText("Loading your teams…")).toHaveLength(2);
  });

  it("surfaces load errors and recovers on retry", async () => {
    const { client, setLoadResult } = createFakeClient({
      loadError: { message: "boom" },
    });
    setTeamsSyncClient(client);
    const user = userEvent.setup();
    renderTeamRoutes(createFakeAuth(), ["/teams/t-1"]);

    expect(await screen.findByText("Teams could not be loaded")).toBeTruthy();
    expect(screen.getByText("Something went wrong. Try again.")).toBeTruthy();

    setLoadResult({
      data: [row({ id: "t-1", name: "Recovered" })],
      error: null,
    });
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Recovered")).toBeTruthy();
  });

  it("persists public toggles for signed-in users", async () => {
    const { client, calls } = createFakeClient({
      rows: [row({ id: "t-1", name: "Mine" })],
    });
    setTeamsSyncClient(client);
    const user = userEvent.setup();
    renderTeamRoutes(createFakeAuth(), ["/teams/t-1"]);

    expect(await screen.findByText("Mine")).toBeTruthy();
    await user.click(screen.getByLabelText("Public team"));

    await waitFor(() => expect(calls.upserts).toHaveLength(1));
    expect(calls.upserts[0]).toMatchObject({ id: "t-1", is_public: true });
  });

  it("hides the public toggle for guests", () => {
    const team = createTeam({ format: "doubles" });
    localTeamStore.save(team);
    renderTeamRoutes(GUEST_AUTH, [`/teams/${team.id}`]);

    expect(screen.getByText(team.name)).toBeTruthy();
    expect(screen.queryByLabelText("Public team")).toBeNull();
  });

  it("deletes a team and restores it on undo", async () => {
    const team = createTeam({ format: "doubles", name: "Vaporize" });
    localTeamStore.save(team);
    const user = userEvent.setup();
    const router = renderTeamRoutes(GUEST_AUTH, [`/teams/${team.id}`]);

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete team" }));
    expect(router.state.location.pathname).toBe("/teams");

    await user.click(await screen.findByRole("button", { name: "Undo" }));
    expect(await screen.findByText("Vaporize")).toBeTruthy();
  });

  it("renames a team inline from the header", async () => {
    const team = createTeam({ format: "doubles", name: "Old name" });
    localTeamStore.save(team);
    const user = userEvent.setup();
    renderTeamRoutes(GUEST_AUTH, [`/teams/${team.id}`]);

    await user.click(screen.getByRole("button", { name: "Rename team" }));
    const input = screen.getByLabelText("Team name");
    await user.clear(input);
    await user.type(input, "Renamed{Enter}");

    expect(
      await screen.findByRole("heading", { name: "Renamed" }),
    ).toBeTruthy();
  });

  it("shows labelled actions on desktop", () => {
    const team = createTeam({ format: "doubles" });
    localTeamStore.save(team);
    renderTeamRoutes(GUEST_AUTH, [`/teams/${team.id}`]);

    expect(screen.getByRole("button", { name: "Export" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Duplicate" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "More actions" })).toBeTruthy();
  });

  it("summarises shared weaknesses in words", () => {
    const team = createTeam({
      format: "doubles",
      members: [
        createDefaultSet("Garchomp"),
        createDefaultSet("Dragonite"),
        createDefaultSet("Salamence"),
      ],
    });
    localTeamStore.save(team);
    renderTeamRoutes(GUEST_AUTH, [`/teams/${team.id}`]);

    expect(screen.getByText("3 Pokémon weak to Ice, no resist")).toBeTruthy();
  });
});

describe("TeamDetailPage in Japanese", () => {
  beforeEach(() => {
    localStorage.clear();
    setLocale("ja");
  });

  afterEach(() => {
    setLocale("en");
    setTeamsSyncClient(null);
  });

  it("renders the analysis warnings and weak spots in Japanese", async () => {
    const team = createTeam({
      format: "doubles",
      members: [createDefaultSet("Garchomp"), createDefaultSet("Garchomp")],
    });
    localTeamStore.save(team);
    renderTeamRoutes(GUEST_AUTH, [`/teams/${team.id}`]);

    expect(
      screen.getByText("Garchompが構築に2匹含まれています。"),
    ).toBeTruthy();
    // The type name arrives with the Japanese names chunk.
    expect(
      await screen.findByText("こおりに弱いポケモンが2匹（耐性なし）"),
    ).toBeTruthy();
  });
});
