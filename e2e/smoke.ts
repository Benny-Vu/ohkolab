import { expect, test as base, type Page } from "@playwright/test";

/**
 * Shared harness for the smoke specs.
 *
 * Every test runs against the preview build in DEMO MODE: the flag that
 * `?demo=1` sets (`ohkolab:demo` in sessionStorage) is seeded with
 * `addInitScript`, so it is in place before the app boots on every
 * navigation. Demo mode is render-only: the specs never sign in and never
 * write to Supabase.
 *
 * The `smoke` fixture also collects console errors and uncaught page
 * errors for the whole test and fails the test when any are left after
 * the allowlist below (network noise from an unconfigured Supabase
 * project, sprite CDN failures and the like — each entry names what it
 * lets through).
 */

const DEMO_FLAG = "ohkolab:demo";

/**
 * Console errors that come from the environment rather than the app.
 * Every entry must name the noise it lets through in the spec's report.
 */
const ALLOWED_CONSOLE_ERRORS: readonly RegExp[] = [
  // The sprite/type-image CDN can hiccup in CI; a broken image is a
  // loading problem, not a layout or routing bug.
  /Failed to load resource/i,
];

type SmokeFixtures = {
  /** Runs around every test: demo mode plus the console-error check. */
  smoke: void;
};

export const test = base.extend<SmokeFixtures>({
  smoke: [
    async ({ page }, use) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });
      page.on("pageerror", (error) => {
        consoleErrors.push(`pageerror: ${String(error)}`);
      });

      await page.addInitScript((flag) => {
        try {
          window.sessionStorage.setItem(flag, "1");
        } catch {
          // Storage can be blocked; demo mode just stays off.
        }
      }, DEMO_FLAG);

      await use();

      const unexpected = consoleErrors.filter(
        (text) => !ALLOWED_CONSOLE_ERRORS.some((pattern) => pattern.test(text)),
      );
      expect(
        unexpected,
        `expected no console errors, got: ${JSON.stringify(unexpected)}`,
      ).toEqual([]);
    },
    { auto: true },
  ],
});

/** The page must not scroll sideways at the project's viewport. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflowing = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(
    overflowing,
    `document.scrollWidth is ${overflowing}px wider than the viewport`,
  ).toBeLessThanOrEqual(0);
}

/** A damage range as the calculator prints it: "31.5 - 37.4%" or "100%". */
export const DAMAGE_RANGE = /\d+(?:\.\d+)?(?: - \d+(?:\.\d+)?)?%/;

/**
 * Seeds the local team store (`ohkolab:teams` in localStorage) before the
 * app boots, so the team pages see the given teams as if the visitor had
 * saved them in this browser. The shape is the store's own `sanitizeTeam`
 * input, so unknown fields are dropped safely.
 */
export async function seedTeams(
  page: Page,
  teams: readonly unknown[],
): Promise<void> {
  await page.addInitScript(
    (stored) => {
      try {
        window.localStorage.setItem("ohkolab:teams", JSON.stringify(stored));
      } catch {
        // Blocked storage: the pages fall back to their empty states.
      }
    },
    { version: 1, teams },
  );
}
