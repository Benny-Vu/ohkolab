import { expect } from "@playwright/test";

import { expectNoHorizontalOverflow, test } from "./smoke";

/**
 * The sign-in page renders. With Supabase configured that means the
 * email/password form and the submit button; an unconfigured build
 * (no VITE_SUPABASE_URL) renders the accounts-unavailable notice instead
 * — both are the page working, so the test pins whichever branch it
 * finds and asserts that branch.
 */
test("sign-in page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();

  const emailField = page.locator("#signin-email");
  const unconfigured = page.getByText("Accounts are unavailable");
  await expect(emailField.or(unconfigured)).toBeVisible();

  if (await emailField.isVisible()) {
    await expect(page.locator("#signin-password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
  } else {
    await expect(unconfigured).toBeVisible();
  }

  await expectNoHorizontalOverflow(page);
});
