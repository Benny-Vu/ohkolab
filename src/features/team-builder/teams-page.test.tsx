import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { createDefaultSet } from "@/data";
import { TeamDetailPage } from "@/features/team-builder/team-detail-page";
import { TeamsPage } from "@/features/team-builder/teams-page";
import { setLocale } from "@/lib/i18n/locale";
import { TEAMS_STORAGE_KEY } from "@/lib/team";
import type { Team } from "@/types/team";

function renderTeams() {
  const router = createMemoryRouter(
    [
      { path: "/teams", element: <TeamsPage /> },
      { path: "/teams/:teamId", element: <TeamDetailPage /> },
    ],
    { initialEntries: ["/teams"] },
  );
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
  return router;
}

describe("team builder pages", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opens the team page when a card is pressed, with the panel's actions", async () => {
    const user = userEvent.setup();
    const team: Team = {
      id: "team-preview-1",
      name: "Preview team",
      format: "doubles",
      members: [createDefaultSet("Garchomp")],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      gameTeamId: "Ab12Cd34Ef",
    };
    localStorage.setItem(
      TEAMS_STORAGE_KEY,
      JSON.stringify({ version: 1, teams: [team] }),
    );
    const router = renderTeams();

    // Pressing the card goes straight to the team; no preview panel.
    await user.click(screen.getByRole("link", { name: "Open Preview team" }));
    expect(router.state.location.pathname).toBe("/teams/team-preview-1");
    expect(
      screen.getByRole("heading", { name: "Preview team" }),
    ).toBeInTheDocument();

    // The actions the list's panel used to hold live on the team page:
    // the team ID copy chip next to the ID field…
    expect(screen.getByText("Ab12Cd34Ef")).toBeInTheDocument();
    // …and "Print team sheet" in the more-actions menu.
    await user.click(screen.getByRole("button", { name: "More actions" }));
    expect(
      screen.getByRole("menuitem", { name: "Print team sheet" }),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no teams", () => {
    renderTeams();
    expect(screen.getByRole("heading", { name: "Teams" })).toBeInTheDocument();
    expect(screen.getByText(/no teams yet/i)).toBeInTheDocument();
  });

  it("creates a team and opens its detail page", async () => {
    const user = userEvent.setup();
    const router = renderTeams();
    await user.click(screen.getByRole("button", { name: "New team" }));
    expect(router.state.location.pathname).toMatch(/^\/teams\//);
    expect(
      screen.getByRole("heading", { name: "Untitled team" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add Pokémon" })).toHaveLength(
      6,
    );
  });

  it("imports a Showdown paste as a new team", async () => {
    const user = userEvent.setup();
    renderTeams();
    await user.click(screen.getByRole("button", { name: "Import" }));
    await user.type(
      screen.getByLabelText("Showdown export"),
      "Garchomp @ Life Orb\nAbility: Rough Skin\nJolly Nature\n- Earthquake",
    );
    await user.click(screen.getByRole("button", { name: "Import team" }));
    expect(await screen.findByText(/Imported 1 Pokémon/)).toBeInTheDocument();
    expect(screen.getByAltText("Garchomp")).toBeInTheDocument();
  });

  it("adds a Pokémon through the editor dialog", async () => {
    const user = userEvent.setup();
    renderTeams();
    await user.click(screen.getByRole("button", { name: "New team" }));
    await user.click(
      screen.getAllByRole("button", { name: "Add Pokémon" })[0]!,
    );
    await user.click(screen.getByRole("combobox", { name: "Species" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search Pokémon" }),
      "Garchomp",
    );
    await user.click(screen.getByRole("option", { name: /Garchomp/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByAltText("Garchomp")).toBeInTheDocument();
    expect(screen.getByText("Team analysis")).toBeInTheDocument();
  });

  it("deletes a team and restores it with Undo", async () => {
    const user = userEvent.setup();
    renderTeams();
    await user.click(screen.getByRole("button", { name: "New team" }));
    await user.click(screen.getByRole("link", { name: "Teams" }));
    await user.click(
      screen.getByRole("button", { name: "Delete Untitled team" }),
    );
    expect(screen.queryByText("Name this team")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(await screen.findByText("Name this team")).toBeInTheDocument();
  });
});

describe("team builder pages in Japanese", () => {
  beforeEach(() => {
    localStorage.clear();
    setLocale("ja");
  });

  afterEach(() => {
    setLocale("en");
  });

  it("renders the teams page in Japanese", () => {
    renderTeams();

    expect(screen.getByRole("heading", { name: "構築" })).toBeInTheDocument();
    expect(screen.getByText("構築がまだありません")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "新規構築" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "インポート" }),
    ).toBeInTheDocument();
  });
});
