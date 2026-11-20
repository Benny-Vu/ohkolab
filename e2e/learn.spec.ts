import { expect } from "@playwright/test";

import { expectNoHorizontalOverflow, test } from "./smoke";

/**
 * /learn: the four explainers and the anchors other pages link to. The
 * page is public and needs no backend, so it runs in every build (unlike
 * the battles board, which probes for its flag).
 */
test("learn page renders the explainers and their anchors", async ({
  page,
}) => {
  await page.goto("/learn");

  await expect(
    page.getByRole("heading", { name: "Learn", exact: true }),
  ).toBeVisible();

  // The load-bearing anchors the calc links to; the 2hko spelling shares
  // the OHKO card. The attribute selector works for "2hko" too — an id
  // starting with a digit is not a valid bare CSS id selector.
  for (const id of [
    "damage-rolls",
    "ohko",
    "2hko",
    "stat-points",
    "speed-ties",
  ]) {
    await expect(page.locator(`[id="${id}"]`)).toBeAttached();
  }

  // The live example: a real damage range from the app's own data layer.
  await expect(page.getByText(/damage \(.*% of its max HP\)\.$/)).toBeVisible();

  await expectNoHorizontalOverflow(page);
});
