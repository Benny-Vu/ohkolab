import { expect } from "@playwright/test";

import { expectNoHorizontalOverflow, test } from "./smoke";

/**
 * The "More" menu: the phone tab bar keeps one row with More before the
 * account tab, its destinations open as menu links, and the active state
 * shows on the trigger while a More page is open.
 */
test("the More menu holds the extra destinations on every layout", async ({
  page,
}) => {
  await page.goto("/");

  // The header nav is hidden on phones, the tab bar on desktop: exactly
  // one More trigger is in view either way.
  const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
  const scope = isMobile
    ? page.getByRole("navigation", { name: "Main" }).nth(1)
    : page.getByRole("banner");
  const trigger = scope.getByRole("button", { name: /More/ });
  await expect(trigger).toBeVisible();

  // The menu items are links; Notes is always there. The flagged items
  // (Battles, Messages) ride along in builds that enable them.
  await trigger.click();
  const menu = page.getByRole("menu");
  const notes = menu.getByRole("menuitem", { name: "Notes" });
  await expect(notes).toHaveAttribute("href", "/notes");
  await notes.click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(
    page.getByRole("heading", { name: "Battle notes", level: 1 }),
  ).toBeVisible();

  // While a More page is open, the trigger shows the active state (the
  // header underlines, the tab bar raises its top bar), and the notes page
  // opens battle mode, its sibling destination.
  await expect(trigger).toHaveClass(/:opacity-100/);
  await page.getByRole("link", { name: "Open battle mode" }).click();
  await expect(page).toHaveURL(/\/calc\/battle$/);

  await expectNoHorizontalOverflow(page);
});
