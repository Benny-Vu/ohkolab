import { expect } from "@playwright/test";

import { expectNoHorizontalOverflow, test } from "./smoke";

/**
 * The learn pages: the hub and its section cards, a guide page, the
 * old-anchor forwarding (the calc's links from before the hub), and the
 * glossary search. Public and backend-free, so it runs in every build.
 */
test("the learn hub lists the sections", async ({ page }) => {
  await page.goto("/learn");

  await expect(
    page.getByRole("heading", { name: "Learn", exact: true }),
  ).toBeVisible();
  for (const [name, href] of [
    ["Vocabulary", "/learn/vocabulary"],
    ["Concepts", "/learn/concepts"],
    ["Types", "/learn/types"],
    ["Field conditions", "/learn/field"],
  ] as const) {
    await expect(page.getByRole("link", { name })).toHaveAttribute(
      "href",
      href,
    );
  }

  await expectNoHorizontalOverflow(page);
});

test("a guide page shows the explainer and its example", async ({ page }) => {
  await page.goto("/learn/damage-rolls");

  await expect(
    page.getByRole("heading", { name: "Damage rolls", exact: true }),
  ).toBeVisible();
  // The live example: a real damage range from the app's own data layer.
  await expect(page.getByText(/damage \(.*% of its max HP\)\.$/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Try it in the calc" }),
  ).toHaveAttribute("href", "/calc");

  await expectNoHorizontalOverflow(page);
});

test("old calc anchors forward to the guide pages", async ({ page }) => {
  await page.goto("/learn#damage-rolls");
  await expect(page).toHaveURL(/\/learn\/damage-rolls$/);
  await expect(
    page.getByRole("heading", { name: "Damage rolls", exact: true }),
  ).toBeVisible();

  // The 2hko spelling lands on the same guide as ohko.
  await page.goto("/learn#2hko");
  await expect(page).toHaveURL(/\/learn\/ohko$/);

  await expectNoHorizontalOverflow(page);
});

test("the glossary search filters the terms", async ({ page }) => {
  await page.goto("/learn/vocabulary");

  await expect(
    page.getByRole("heading", { name: "Vocabulary", exact: true }),
  ).toBeVisible();
  // The desktop sidebar lists every term regardless of the filter, so
  // the assertions scope to the article column.
  const column = page.locator("article");
  await expect(column.getByText("STAB")).toBeVisible();

  await page.getByRole("searchbox").fill("stab");
  await expect(column.getByText("STAB")).toBeVisible();
  await expect(column.getByText("Fake Out")).toHaveCount(0);

  await expectNoHorizontalOverflow(page);
});
