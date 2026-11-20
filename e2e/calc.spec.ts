import { expect, type Page } from "@playwright/test";

import { DAMAGE_RANGE, expectNoHorizontalOverflow, test } from "./smoke";

/**
 * Switches to one side's section ("Attacker" or "Defender") on the phone
 * layout, where only one section is mounted at a time. On wide screens
 * both sections are mounted and there is no tab to click.
 */
async function showSection(
  page: Page,
  section: "Attacker" | "Defender",
): Promise<void> {
  const tab = page.getByRole("radio", { name: section, exact: true });
  if ((await tab.count()) > 0) {
    await tab.click();
  }
}

/** One side's panel, found by its "Attacker" / "Defender" heading. */
function sidePanel(page: Page, section: "Attacker" | "Defender") {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: section, exact: true }),
  });
}

/**
 * Picks a species in one side's panel through the searchable picker.
 */
async function pickSpecies(
  page: Page,
  section: "Attacker" | "Defender",
  species: string,
): Promise<void> {
  await showSection(page, section);
  await sidePanel(page, section)
    .getByRole("combobox", { name: "Species" })
    .first()
    .click();
  await page.getByPlaceholder("Search Pokémon or type…").fill(species);
  await page.getByRole("option", { name: species, exact: true }).click();
}

/** Picks a move for one side's first move slot. */
async function pickMove(
  page: Page,
  section: "Attacker" | "Defender",
  move: string,
): Promise<void> {
  await showSection(page, section);
  await sidePanel(page, section)
    .getByRole("combobox", { name: "Move 1" })
    .click();
  await page.getByPlaceholder("Search moves or type…").fill(move);
  await page.getByRole("option", { name: move, exact: true }).click();
}

/**
 * The damage calculator: after picking an attacker with a move and a
 * defender, the results area shows a damage range ("31.5 - 37.4%") for
 * the picked move. On wide screens the results panel carries it; on the
 * phone it is the sticky result bar.
 */
test("damage calculator shows a result after picking two Pokémon", async ({
  page,
}) => {
  await page.goto("/calc");
  await expect(
    page.getByRole("heading", { name: "Damage calculator", exact: true }),
  ).toBeVisible();

  // Picking a species starts a blank set, so a move is picked too.
  await pickSpecies(page, "Attacker", "Garchomp");
  await pickMove(page, "Attacker", "Earthquake");

  await pickSpecies(page, "Defender", "Incineroar");

  // The result names the move and shows its damage range.
  await expect(page.getByText("Earthquake").first()).toBeVisible();
  await expect(page.getByText(DAMAGE_RANGE).first()).toBeVisible();

  await expectNoHorizontalOverflow(page);
});
