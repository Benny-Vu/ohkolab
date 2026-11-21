import { expect } from "@playwright/test";

import { expectNoHorizontalOverflow, test } from "./smoke";

// OHKOLab never stores or shows tournament players' names or countries
// (we can't know a player's age, and discovery never surfaces minors). The
// check is structural, so no real person's handle lives in this repo: the
// snapshot the page serves carries no field that could hold one.
const PERSONAL_KEYS = /^(name|player|players?Name|username|handle|country)$/i;

function personalKeys(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => personalKeys(item, `${path}[${i}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => [
      ...(PERSONAL_KEYS.test(key) ? [`${path}.${key}`] : []),
      ...personalKeys(child, `${path}.${key}`),
    ]);
  }
  return [];
}

test("the /meta top teams view shows teams and their source, and stores no player data", async ({
  page,
}) => {
  // The data the view loads holds no personal field at any depth.
  const response = await page.request.get("/data/top-teams/teams.json");
  expect(response.ok()).toBe(true);
  expect(personalKeys(await response.json())).toEqual([]);

  await page.goto("/meta");
  await page.getByRole("tab", { name: "Top teams" }).click();

  // The first page of real team cards, and the view never scrolls
  // sideways (the grid pages 12 at a time).
  const firstCard = page.getByRole("button", { name: /#/ }).first();
  await expect(firstCard).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // The team detail: the Limitless source link (names live there, not here).
  await firstCard.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const source = dialog.getByRole("link", { name: "View on Limitless" });
  await expect(source).toHaveAttribute(
    "href",
    /^https:\/\/play\.limitlesstcg\.com\/tournaments\//,
  );
  // The SP honesty line is part of the deal: the sheet publishes no
  // Stat Points, and the view says so.
  await expect(
    dialog.getByText("SP not published, common spread assumed."),
  ).toBeVisible();

  await expectNoHorizontalOverflow(page);
});
