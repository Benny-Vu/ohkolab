import { expect } from "@playwright/test";

import { expectNoHorizontalOverflow, test } from "./smoke";

// A real player name from one of the snapshot's events, read once from
// the public standings during development: the winner of Talon's FIGHT
// CLUB #111 (the seed's first team). OHKOLab never stores names; this
// spec proves the /meta Top teams view never renders one either.
const KNOWN_PLAYER_NAME = "JurassicJoints";

test("the /meta top teams view shows teams, their source and no player name", async ({
  page,
}) => {
  await page.goto("/meta");
  await page.getByRole("tab", { name: "Top teams" }).click();

  // The first page of real team cards, and the view never scrolls
  // sideways (the grid pages 12 at a time; the seed is ~1 MB).
  const firstCard = page.getByRole("button", { name: /#/ }).first();
  await expect(firstCard).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // No player name renders anywhere on the page.
  await expect(page.getByText(KNOWN_PLAYER_NAME)).toHaveCount(0);

  // The team detail: the Limitless source link, and still no name.
  await firstCard.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const source = dialog.getByRole("link", { name: "View on Limitless" });
  await expect(source).toHaveAttribute(
    "href",
    /^https:\/\/play\.limitlesstcg\.com\/tournaments\//,
  );
  await expect(dialog.getByText(KNOWN_PLAYER_NAME)).toHaveCount(0);
  // The SP honesty line is part of the deal: the sheet publishes no
  // Stat Points, and the view says so.
  await expect(
    dialog.getByText("SP not published, common spread assumed."),
  ).toBeVisible();

  await expectNoHorizontalOverflow(page);
});
