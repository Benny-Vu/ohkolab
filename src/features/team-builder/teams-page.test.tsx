import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { TeamDetailPage } from "@/features/team-builder/team-detail-page";
import { TeamsPage } from "@/features/team-builder/teams-page";

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
    expect(screen.getByRole("img", { name: "Garchomp" })).toBeInTheDocument();
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
    expect(await screen.findByText("Garchomp")).toBeInTheDocument();
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
    expect(screen.queryByText("Untitled team")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(await screen.findByText("Untitled team")).toBeInTheDocument();
  });
});
