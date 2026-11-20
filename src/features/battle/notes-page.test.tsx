import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { Providers } from "@/app/providers";
import { NotesPage } from "@/features/battle/notes-page";
import {
  addNotesMove,
  getBattleNotesState,
  resetBattleNotesStore,
  setNotesPreview,
} from "@/features/battle/notes-store";

/**
 * The notes page (/calc/battle/notes): cards per previewed Pokémon, the
 * revealed pickers, the game counter with the brought chips, the turn log
 * and the archive — all autosaved, so a fresh page load (a reset store)
 * still shows what was noted.
 */

function renderNotes() {
  const router = createMemoryRouter(
    [
      { path: "/calc/battle/notes", element: <NotesPage /> },
      { path: "/calc/battle", element: <div /> },
    ],
    { initialEntries: ["/calc/battle/notes"] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("NotesPage", () => {
  beforeEach(() => {
    localStorage.clear();
    resetBattleNotesStore();
  });

  it("adds a Pokémon by hand from the empty state", async () => {
    const user = userEvent.setup();
    renderNotes();

    expect(screen.getByText("Add a Pokémon to start noting.")).toBeVisible();

    await user.click(screen.getByRole("combobox", { name: "Add Pokémon" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search Pokémon" }),
      "incineroar",
    );
    await user.click(screen.getByText("Incineroar"));

    expect(
      screen.getByRole("button", { name: "Notes for Incineroar" }),
    ).toBeVisible();
    expect(getBattleNotesState().current.preview).toEqual(["Incineroar"]);
  });

  it("reveals fields through the card and keeps them after a reload", async () => {
    const user = userEvent.setup();
    setNotesPreview(["Incineroar", "Garchomp"]);
    const { unmount } = renderNotes();

    await user.click(
      screen.getByRole("button", { name: "Notes for Incineroar" }),
    );
    await user.click(screen.getByRole("combobox", { name: "Item" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search items" }),
      "leftovers",
    );
    await user.click(screen.getByText("Leftovers"));

    // A fresh page load: the store re-reads storage from scratch.
    unmount();
    resetBattleNotesStore();
    renderNotes();

    expect(screen.getByText("Leftovers")).toBeVisible();
    expect(getBattleNotesState().current.notes["Incineroar"]?.item).toBe(
      "Leftovers",
    );
  });

  it("switches games, records what was brought and archives a new set", async () => {
    const user = userEvent.setup();
    setNotesPreview(["Incineroar", "Garchomp"]);
    renderNotes();

    // Notes carry across games; the brought chips are per game.
    await user.click(screen.getByRole("radio", { name: "2" }));
    await user.click(screen.getByRole("button", { name: "Incineroar" }));
    expect(getBattleNotesState().current.game).toBe(2);
    expect(getBattleNotesState().current.brought).toEqual([
      { game: 2, species: ["Incineroar"] },
    ]);

    // "New opponent" archives the set; the history opens with its entry.
    await user.click(screen.getByRole("button", { name: "New opponent" }));
    expect(getBattleNotesState().history).toHaveLength(1);
    expect(screen.getByText(/2 Pokémon/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(getBattleNotesState().history).toEqual([]);
  });

  it("logs a quick line from a revealed move", async () => {
    const user = userEvent.setup();
    setNotesPreview(["Incineroar"]);
    addNotesMove("Incineroar", "Fake Out");
    renderNotes();

    await user.click(
      screen.getByRole("button", { name: "Notes for Incineroar" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Log Fake Out for Incineroar" }),
    );

    expect(screen.getByText("T1: Fake Out → Incineroar")).toBeVisible();
    expect(getBattleNotesState().current.turn).toBe(2);
  });
});
