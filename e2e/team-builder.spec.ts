import { expect } from "@playwright/test";

import { expectNoHorizontalOverflow, test } from "./smoke";

/**
 * A minimal Showdown paste the app's importer accepts: the species, item,
 * level, a mainline EV spread (converted to Stat Points on import) and
 * one move.
 */
const SHOWDOWN_PASTE = [
  "Garchomp @ Choice Scarf",
  "Level: 50",
  "EVs: 252 Atk",
  "Jolly Nature",
  "- Earthquake",
].join("\n");

/** The team builder imports a Showdown paste into a new team. */
test("team builder imports a Showdown paste", async ({ page }) => {
  await page.goto("/teams");
  await expect(
    page.getByRole("heading", { name: "Teams", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Import", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog
    .getByRole("textbox", { name: "Showdown export" })
    .fill(SHOWDOWN_PASTE);
  await dialog.getByRole("button", { name: "Import team" }).click();

  // The import lands on the new team's page and shows the Pokémon.
  await expect(page).toHaveURL(/\/teams\/[^/]+$/);
  await expect(page.getByText("Garchomp").first()).toBeVisible();
  await expect(page.getByText("Earthquake").first()).toBeVisible();

  await expectNoHorizontalOverflow(page);
});
