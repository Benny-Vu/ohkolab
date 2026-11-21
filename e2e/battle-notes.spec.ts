import { expect } from "@playwright/test";

import { expectNoHorizontalOverflow, test } from "./smoke";

/**
 * Battle notes (/notes, and inline in battle mode): notes taken on the
 * phone survive a reload, and the revealed fields reach the KO matrix —
 * the provenance badge turns "Revealed" and a revealed Mega Stone turns
 * the opponent's column into its Mega forme. Speed relations name one of
 * my Pokémon, narrow the opponent into a Speed range with a plain hint,
 * and the speed order carries that band labelled as coming from the notes.
 * The old /calc/battle/notes address redirects to /notes.
 */

const MY_PASTE = [
  "Garchomp @ Life Orb",
  "Ability: Rough Skin",
  "Jolly Nature",
  "EVs: 32 Atk / 32 Spe",
  "- Earthquake",
  "- Dragon Claw",
  "",
  "Incineroar @ Leftovers",
  "Ability: Intimidate",
  "Careful Nature",
  "- Flare Blitz",
  "- Knock Off",
].join("\n");

/** Picks a species through the standalone page's "Add Pokémon" picker. */
async function addSpecies(
  page: import("@playwright/test").Page,
  species: string,
) {
  await page.getByRole("combobox", { name: "Add Pokémon" }).click();
  await page.getByPlaceholder("Search Pokémon or type…").fill(species);
  await page.getByRole("option", { name: species, exact: true }).click();
}

test("battle notes persist across a reload and reach the matrix", async ({
  page,
}) => {
  // The old address still works: it redirects to /notes.
  await page.goto("/calc/battle/notes");
  await expect(page).toHaveURL(/\/notes$/);

  await page.goto("/notes");
  await expect(
    page.getByRole("heading", { name: "Battle notes", level: 1 }),
  ).toBeVisible();

  // Build the team-preview six by hand and note what was revealed.
  await addSpecies(page, "Incineroar");
  await addSpecies(page, "Garchomp");

  // Garchomp Mega-evolved: its revealed Mega Stone decides the forme.
  await page.getByRole("button", { name: "Notes for Garchomp" }).click();
  await page.getByRole("combobox", { name: "Item" }).click();
  await page.getByPlaceholder("Search items or effects…").fill("garchompite");
  await page.getByRole("option", { name: "Garchompite", exact: true }).click();
  await page.getByRole("button", { name: "Notes for Garchomp" }).click();

  // Incineroar: a revealed item, a revealed move and a free note.
  await page.getByRole("button", { name: "Notes for Incineroar" }).click();
  await page.getByRole("combobox", { name: "Item" }).click();
  await page.getByPlaceholder("Search items or effects…").fill("leftovers");
  await page.getByRole("option", { name: "Leftovers", exact: true }).click();
  await page.getByRole("combobox", { name: "Add move" }).click();
  await page.getByPlaceholder("Search moves or type…").fill("flare blitz");
  await page.getByRole("option", { name: "Flare Blitz", exact: true }).click();
  await page
    .getByPlaceholder("Anything else worth remembering")
    .fill("Leads with Fake Out");

  // Nothing is lost on reload: the cards keep what was revealed.
  await page.reload();
  await expect(page.getByText("Leftovers").first()).toBeVisible();
  await expect(page.getByText("Flare Blitz").first()).toBeVisible();
  await expect(page.getByText("Garchompite").first()).toBeVisible();

  // Battle mode with the same six on each side: the notes overlay the
  // common-set guesses in the matrix and the speed order.
  await page.goto("/calc/battle");
  await page.getByRole("button", { name: "Paste a team" }).click();
  const myDialog = page.getByRole("dialog");
  await myDialog.getByRole("textbox").fill(MY_PASTE);
  await myDialog.getByRole("button", { name: "Use paste" }).click();

  await page.getByRole("button", { name: "Paste from team preview" }).click();
  const theirDialog = page.getByRole("dialog");
  await theirDialog.getByRole("textbox").fill("Incineroar\nGarchomp");
  await theirDialog.getByRole("button", { name: "Read team" }).click();

  // Both slots are labelled "revealed" now, not "common set".
  await expect(page.getByText("Revealed", { exact: true })).toHaveCount(2);

  // The KO matrix answers with the Mega forme in Garchomp's column.
  await expect(page.getByText("Garchomp-Mega").first()).toBeVisible();
  await expect(
    page.locator("table button", { hasText: "%" }).first(),
  ).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test("speed notes tie to your team, give a range and reach the speed order", async ({
  page,
}) => {
  await page.goto("/calc/battle");

  // My side pasted in (so the notes can name my Pokémon), their side typed.
  await page.getByRole("button", { name: "Paste a team" }).click();
  const myDialog = page.getByRole("dialog");
  await myDialog.getByRole("textbox").fill(MY_PASTE);
  await myDialog.getByRole("button", { name: "Use paste" }).click();

  await page.getByRole("button", { name: "Paste from team preview" }).click();
  const theirDialog = page.getByRole("dialog");
  await theirDialog.getByRole("textbox").fill("Garchomp");
  await theirDialog.getByRole("button", { name: "Read team" }).click();

  // Open the opponent's card and note "Slower than my Incineroar".
  await page.getByRole("button", { name: "Notes for Garchomp" }).click();
  await page.getByRole("button", { name: "Slower than" }).click();
  await page.getByRole("button", { name: /Incineroar \d+/ }).click();
  await page.getByRole("button", { name: "Note it" }).click();

  // The relation chip shows, with the range and the plain hint under it.
  // Garchomp slower than an Incineroar is below any Garchomp spread, so
  // the hint says its Speed was lowered rather than guessing a nature.
  await expect(
    page.getByText(/Slower than your Incineroar \(\d+\)/),
  ).toBeVisible();
  await expect(page.getByText(/Speed at most \d+\./)).toBeVisible();
  await expect(
    page.getByText(/Slower than it can be: its Speed was probably lowered/),
  ).toBeVisible();

  // The speed order carries the band, labelled as coming from the notes.
  await expect(page.getByText(/≤\d+ · from your notes/)).toBeVisible();

  await expectNoHorizontalOverflow(page);
});
