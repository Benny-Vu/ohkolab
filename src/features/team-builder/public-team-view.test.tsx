import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";
import { createDefaultSet } from "@/data";
import { PublicTeamView } from "@/features/team-builder/public-team-view";
import { TEAMS_STORAGE_KEY } from "@/lib/team";
import type { TeamRow } from "@/lib/database.types";
import type { AppSupabaseClient } from "@/lib/supabase";

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

const PROFILE_ROW = {
  id: "user-1",
  username: "ashketchum",
  display_name: "Ash",
  avatar_species: "Pikachu",
  bio: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

/**
 * A Supabase stand-in: `teams` answers a public-team lookup through
 * select/eq/eq/maybeSingle, `profiles` a by-ids lookup through select/in.
 */
function createFakeClient(row: TeamRow | null) {
  // The client only ever returns public teams, like the RLS policy does.
  const visible = row && row.is_public ? row : null;
  const client = {
    from(table: string) {
      if (table === "teams") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: visible, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          in: () => Promise.resolve({ data: [PROFILE_ROW], error: null }),
        }),
      };
    },
  } as unknown as AppSupabaseClient;
  return client;
}

function renderView(
  row: TeamRow | null,
  teamId = "11111111-1111-1111-1111-111111111111",
) {
  const router = createMemoryRouter(
    [
      {
        path: "/teams/:teamId",
        element: (
          <PublicTeamView client={createFakeClient(row)} teamId={teamId} />
        ),
      },
    ],
    { initialEntries: [`/teams/${teamId}`] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("PublicTeamView", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a public team read-only with share and copy actions", async () => {
    renderView(teamRow());

    expect(
      await screen.findByRole("heading", { name: "Champion team" }),
    ).toBeInTheDocument();
    // The owner line appears once the profile loads (part of the
    // page description).
    expect(
      await screen.findByText(/shared by @ashketchum/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy to my teams" }),
    ).toBeInTheDocument();
    // Read-only: no editor controls anywhere.
    expect(screen.queryByLabelText("Public team")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "More actions" }),
    ).not.toBeInTheDocument();
  });

  it("copies the team into the visitor's own teams", async () => {
    const user = userEvent.setup();
    renderView(teamRow());

    await user.click(
      await screen.findByRole("button", { name: "Copy to my teams" }),
    );

    expect(
      await screen.findByText('Copied "Champion team" to your teams.'),
    ).toBeInTheDocument();
    const stored = JSON.parse(
      localStorage.getItem(TEAMS_STORAGE_KEY) ?? "{}",
    ) as { teams?: unknown[] };
    expect(stored.teams).toHaveLength(1);
  });

  it("says the team is not found when it is not public", async () => {
    // Its own id: the query cache is shared across tests in the file.
    renderView(
      teamRow({ id: "22222222-2222-2222-2222-222222222222", is_public: false }),
      "22222222-2222-2222-2222-222222222222",
    );

    expect(
      await screen.findByRole("heading", { name: "Team not found" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Share" }),
    ).not.toBeInTheDocument();
  });

  it("says the team is not found without a client", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/teams/:teamId",
          element: <PublicTeamView client={null} teamId="t-1" />,
        },
      ],
      { initialEntries: ["/teams/t-1"] },
    );
    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    );

    expect(
      screen.getByRole("heading", { name: "Team not found" }),
    ).toBeInTheDocument();
  });
});
