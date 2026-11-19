import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { Providers } from "@/app/providers";
import { createDefaultSet } from "@/data";
import { TeamPrintPage } from "@/features/team-builder/team-print-page";
import { TEAMS_STORAGE_KEY } from "@/lib/team";
import type { Team } from "@/types/team";

function seedTeam(overrides: Partial<Team> = {}): Team {
  const team: Team = {
    id: "team-print-1",
    name: "Print me",
    format: "doubles",
    members: [
      { ...createDefaultSet("Garchomp"), nature: "Jolly" },
      createDefaultSet("Incineroar"),
    ],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    gameTeamId: "Ab12Cd34Ef",
    ...overrides,
  };
  localStorage.setItem(
    TEAMS_STORAGE_KEY,
    JSON.stringify({ version: 1, teams: [team] }),
  );
  return team;
}

function renderPrintPage() {
  const router = createMemoryRouter(
    [{ path: "/teams/:teamId/print", element: <TeamPrintPage /> }],
    { initialEntries: ["/teams/team-print-1/print"] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("TeamPrintPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the sheet with all six slots, the team ID and the footer", () => {
    seedTeam();
    const { container } = renderPrintPage();

    const sheet = container.querySelector("#team-print-sheet");
    expect(sheet).not.toBeNull();
    // Six slots: two members plus four dashed placeholders.
    expect(sheet!.querySelectorAll("#team-print-slots > div")).toHaveLength(6);
    expect(screen.getByText("Garchomp")).toBeInTheDocument();
    expect(screen.getByText("Incineroar")).toBeInTheDocument();
    expect(screen.getByText(/Team ID/)).toBeInTheDocument();
    expect(screen.getByText("Ab12Cd34Ef")).toBeInTheDocument();
    expect(
      screen.getByText("Made with OHKOLab · ohkolab.com"),
    ).toBeInTheDocument();
  });

  it("prints the full list by default and hides nature and SP in the open sheet", async () => {
    const user = userEvent.setup();
    const team = seedTeam();
    renderPrintPage();

    // Full team list: the first member's nature and SP spread are printed
    // (the nature shares its line with the level).
    const nature = team.members[0]!.nature;
    expect(screen.getByText(new RegExp(nature))).toBeInTheDocument();
    // Both members print their SP spread in the full list.
    expect(screen.getAllByText(/SP HP \d/)).toHaveLength(2);

    await user.click(screen.getByRole("radio", { name: "Open team sheet" }));

    // Open team sheet: species, item, ability and moves only.
    expect(screen.queryByText(new RegExp(nature))).not.toBeInTheDocument();
    expect(screen.queryByText(/SP HP \d/)).not.toBeInTheDocument();
    expect(screen.getByText("Garchomp")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Full team list" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("keeps the player fields out of every store", async () => {
    const user = userEvent.setup();
    seedTeam();
    const storedBefore = localStorage.getItem(TEAMS_STORAGE_KEY);
    renderPrintPage();

    await user.type(screen.getByLabelText("Player name"), "Ash Ketchum");
    await user.type(screen.getByLabelText("Player ID"), "1234567890");

    expect(screen.getByLabelText("Player name")).toHaveValue("Ash Ketchum");
    expect(screen.getByText("Ash Ketchum · 1234567890")).toBeInTheDocument();
    // Page state only: nothing was written to localStorage.
    expect(localStorage.getItem(TEAMS_STORAGE_KEY)).toBe(storedBefore);
    expect(localStorage.length).toBe(1);
  });

  it("says the team is not found when no team matches the id", () => {
    seedTeam({ id: "other-team" });
    renderPrintPage();

    expect(
      screen.getByRole("heading", { name: "Team not found" }),
    ).toBeInTheDocument();
  });
});
