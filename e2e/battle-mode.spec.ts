import { expect } from "@playwright/test";

import { expectNoHorizontalOverflow, test } from "./smoke";

/**
 * Battle mode (/calc/battle): pasting a team on each side fills the KO
 * matrix (cells with damage percentages) and the speed order. The page is
 * not behind a launch flag, so this always runs — in demo mode too, since
 * pasted teams need no account.
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

test("battle mode pastes both sides and shows the matrix and speed order", async ({
  page,
}) => {
  await page.goto("/calc/battle");
  await expect(
    page.getByRole("heading", { name: "Battle mode" }),
  ).toBeVisible();

  // My side: a Showdown paste of my own team.
  await page.getByRole("button", { name: "Paste a team" }).click();
  const myDialog = page.getByRole("dialog");
  await myDialog.getByRole("textbox").fill(MY_PASTE);
  await myDialog.getByRole("button", { name: "Use paste" }).click();

  // Their side: a plain team-preview list, one species per line.
  await page.getByRole("button", { name: "Paste from team preview" }).click();
  const theirDialog = page.getByRole("dialog");
  await theirDialog
    .getByRole("textbox")
    .fill("Rillaboom\nWhimsicott\nGarchomp");
  await theirDialog.getByRole("button", { name: "Read team" }).click();

  // The KO matrix renders a cell per pair with a damage percentage.
  const matrix = page.locator("table[aria-label='Your best move into theirs']");
  await expect(matrix).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Garchomp .* vs / }).first(),
  ).toBeVisible();
  await expect(
    page.locator("table button", { hasText: "%" }).first(),
  ).toBeVisible();

  // The speed order lists all six names, fastest first.
  const speed = page.getByRole("list", {
    name: "Speed order of all twelve Pokémon",
  });
  await expect(speed).toBeVisible();
  await expect(speed.getByText("Rillaboom").first()).toBeVisible();
  await expect(speed.getByText("Whimsicott").first()).toBeVisible();

  await expectNoHorizontalOverflow(page);
});
