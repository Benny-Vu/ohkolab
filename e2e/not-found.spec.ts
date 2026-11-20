import { expect } from "@playwright/test";

import { expectNoHorizontalOverflow, test } from "./smoke";

/** An unknown path shows the not-found page. */
test("unknown path shows the 404 page", async ({ page }) => {
  await page.goto("/no-such-e2e-path");
  await expect(
    page.getByRole("heading", { name: "Page not found", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("404")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();

  await expectNoHorizontalOverflow(page);
});
