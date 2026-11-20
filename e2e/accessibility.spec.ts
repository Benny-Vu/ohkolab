import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";

import { test } from "./smoke";

/**
 * The accessibility audit: every main page, scanned with axe in each
 * Playwright project — phone and desktop width, dark and light theme (the
 * projects seed the theme in localStorage). A serious or critical
 * violation fails the suite; "moderate" and "minor" findings are left
 * to the wave report.
 *
 * Everything runs in demo mode against the preview build, so pages
 * render without a backend. Pages whose data needs Supabase still scan:
 * their loading, empty and not-configured states are part of the page.
 */
const PAGES: readonly { path: string; name: string; slow?: boolean }[] = [
  { path: "/", name: "home" },
  { path: "/calc", name: "calc" },
  { path: "/teams", name: "teams" },
  // The usage table renders ~200 rows at mount, so the scan alone takes
  // close to the default 30 s on CI runners. Slow until the table is
  // virtualized.
  { path: "/meta", name: "metagame", slow: true },
  { path: "/learn", name: "learn" },
  { path: "/changelog", name: "changelog" },
  { path: "/login", name: "login" },
  { path: "/groups", name: "groups" },
  { path: "/terms", name: "terms" },
  { path: "/privacy", name: "privacy" },
  { path: "/credits", name: "credits" },
  { path: "/press", name: "press" },
];

for (const { path, name, slow } of PAGES) {
  test(`accessibility: ${name} has no serious or critical violations`, async ({
    page,
  }) => {
    test.slow(slow === true, "large table makes the axe scan slow");
    await page.goto(path);
    // The app boots lazily; give the page's content a moment to replace
    // the loading state so axe scans the real page, not the skeletons.
    await page.waitForLoadState("networkidle");
    await page
      .locator("main")
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    );
    const summary = serious.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target).slice(0, 3),
    }));
    expect(summary).toEqual([]);
  });
}

test("accessibility: battle board has no serious or critical violations", async ({
  page,
}) => {
  await page.goto("/battles");

  // /battles is only routed while VITE_BATTLES is on; skip like the
  // board spec does when this build answers with its 404 page.
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

  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );
  const summary = serious.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.target).slice(0, 3),
  }));
  expect(summary).toEqual([]);
});
