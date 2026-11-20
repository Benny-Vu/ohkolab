import { expect } from "@playwright/test";

import { expectNoHorizontalOverflow, seedTeams, test } from "./smoke";

/** One Garchomp set in the shape the team store's `sanitizeTeam` reads. */
const GARCHOMP = {
  species: "Garchomp",
  item: "Choice Scarf",
  ability: "Rough Skin",
  nature: "Jolly",
  statPoints: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
  moves: ["Earthquake", null, null, null],
};

/**
 * The team sheet print page renders a saved team: the sheet with the
 * Pokémon on it and the print button. The team is seeded straight into
 * the local team store, as if the visitor had saved it in this browser.
 */
test("team sheet print page renders the saved team", async ({ page }) => {
  await seedTeams(page, [
    {
      id: "e2e-sheet-team",
      name: "E2E sheet team",
      format: "doubles",
      members: [GARCHOMP],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ]);

  await page.goto("/teams/e2e-sheet-team/print");
  await expect(
    page.getByRole("heading", { name: "Print team sheet", exact: true }),
  ).toBeVisible();

  // The sheet itself, with the seeded Pokémon and the print button.
  const sheet = page.locator("#team-print-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Garchomp").first()).toBeVisible();
  await expect(sheet.getByText("E2E sheet team")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Print", exact: true }),
  ).toBeVisible();

  await expectNoHorizontalOverflow(page);
});
