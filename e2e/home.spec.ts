import { expect } from "@playwright/test";

import { expectNoHorizontalOverflow, test } from "./smoke";

/**
 * Home renders: the app shell (header, main) plus real content. Which
 * content depends on the build — without Supabase the tools intro shows,
 * with it the demo feed (sample posts, each marked "Example") — so the
 * test pins the branch it finds and asserts that branch's content.
 */
test("home renders feed or tools content inside the app shell", async ({
  page,
}) => {
  await page.goto("/");

  // The shell: sticky header with the home link, and a main landmark.
  await expect(page.getByRole("link", { name: "OHKOLab home" })).toBeVisible();
  const main = page.locator("main");
  await expect(main).toBeVisible();

  // The feed has a "Latest / Following" segmented control; the tools
  // intro does not. One of the two must be on screen.
  const feedTabs = page.getByRole("radio", { name: "Latest" });
  const isFeed = (await feedTabs.count()) > 0;

  if (isFeed) {
    // Demo mode fills the empty feed with sample posts marked as examples.
    await expect(main.getByText("Rika")).toBeVisible();
    await expect(
      main.getByText("Example", { exact: true }).first(),
    ).toBeVisible();
  } else {
    // The signed-out tools intro links to the three tools.
    await expect(main.getByRole("heading", { name: /^OHKO/ })).toBeVisible();
    await expect(
      main.getByRole("link", { name: /Damage calculator/ }),
    ).toBeVisible();
  }

  await expectNoHorizontalOverflow(page);
});
