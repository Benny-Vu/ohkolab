import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { Providers } from "@/app/providers";
import { BattlePage } from "@/features/battle/battle-page";

const MY_PASTE = [
  "Garchomp @ Life Orb",
  "Ability: Rough Skin",
  "Jolly Nature",
  "EVs: 32 Atk / 32 Spe",
  "- Earthquake",
  "- Dragon Claw",
].join("\n");

const THEIR_PASTE = ["Incineroar", "Whimsicott"].join("\n");

function renderBattle() {
  const router = createMemoryRouter(
    [{ path: "/calc/battle", element: <BattlePage /> }],
    { initialEntries: ["/calc/battle"] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

/** Fills one of the two paste dialogs and confirms it. */
async function paste(
  user: ReturnType<typeof userEvent.setup>,
  openButton: string,
  confirmButton: string,
  text: string,
): Promise<void> {
  await user.click(screen.getByRole("button", { name: openButton }));
  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByRole("textbox"), text);
  await user.click(within(dialog).getByRole("button", { name: confirmButton }));
}

describe("BattlePage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the frame, the format toggle and both sides' empty states", () => {
    renderBattle();

    expect(
      screen.getByRole("heading", { name: "Battle mode" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Doubles" })).toBeChecked();
    expect(
      screen.getByText("Pick a saved team or paste one to start."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Add the opponent's Pokémon to see the matchups."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Both teams need at least one Pokémon."),
    ).toBeInTheDocument();
  });

  it("pastes both sides and shows the matrix cells and the speed order", async () => {
    const user = userEvent.setup();
    renderBattle();

    await paste(user, "Paste a team", "Use paste", MY_PASTE);
    await waitFor(() =>
      expect(screen.getAllByText("Garchomp").length).toBeGreaterThan(0),
    );

    await paste(user, "Paste from team preview", "Read team", THEIR_PASTE);
    await waitFor(() =>
      expect(screen.getAllByText("Incineroar").length).toBeGreaterThan(0),
    );

    // The matrix renders a cell per pair, with damage ranges.
    await waitFor(() => {
      const cells = screen.getAllByRole("button", { name: / vs / });
      expect(cells.length).toBeGreaterThan(0);
    });
    await waitFor(() =>
      expect(screen.getAllByText(/%$/).length).toBeGreaterThan(0),
    );

    // The speed order lists all three by name, fastest first.
    const speed = screen.getByRole("list", {
      name: "Speed order of all twelve Pokémon",
    });
    const rows = within(speed).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    const firstRow = rows[0];
    if (!firstRow) throw new Error("speed order rendered no rows");
    expect(within(firstRow).getByText("Garchomp")).toBeInTheDocument();

    // Tapping a cell opens the pair's full calc.
    const firstCell =
      screen
        .getAllByRole("button", { name: /Garchomp .* vs / })
        .find((button) => button.textContent?.includes("%")) ?? null;
    if (firstCell) {
      await user.click(firstCell);
      const sheet = await screen.findByRole("dialog");
      expect(within(sheet).getByText("Earthquake")).toBeInTheDocument();
    }
  });
});
