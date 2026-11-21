import { expect } from "@playwright/test";

import { expectNoHorizontalOverflow, test } from "./smoke";

/**
 * The battle board in demo mode: signed-out visitors see the sign-in
 * card and, below it, the sample requests (each marked "Example").
 *
 * /battles is only routed while VITE_BATTLES is on. The flag is off in a
 * plain local build, so the spec probes the route first and skips when
 * the app answers with its 404 page — in CI the preview is built with
 * the launch flags and the board runs.
 */
test("battle board renders demo requests", async ({ page }) => {
  await page.goto("/battles");

  // Wait until the app has answered with either the board or its 404.
  const boardTitle = page.getByRole("heading", {
    name: "Battles",
    exact: true,
  });
  const notFound = page.getByRole("heading", {
    name: "Page not found",
    exact: true,
  });
  await expect(boardTitle.or(notFound)).toBeVisible();

  if (await notFound.isVisible()) {
    test.skip(
      true,
      "VITE_BATTLES is off in this build: /battles is not routed",
    );
  }

  await expect(boardTitle).toBeVisible();
  await expect(page.getByText("Sign in to find an opponent.")).toBeVisible();

  // Demo mode: the sample requests, marked as examples.
  await expect(page.getByText("Rika").first()).toBeVisible();
  await expect(
    page.getByText("Example", { exact: true }).first(),
  ).toBeVisible();

  await expectNoHorizontalOverflow(page);
});
