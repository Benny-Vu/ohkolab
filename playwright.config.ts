import { defineConfig } from "@playwright/test";

/**
 * Real-browser smoke tests against `vite preview`, in demo mode
 * (`?demo=1`): no Supabase writes, no real accounts. Every spec runs at
 * phone (360x640) and desktop (1280x800) width, in dark and light: the
 * app's theme lives in localStorage (`ohkolab:theme`, dark by default),
 * not in prefers-color-scheme, so the light projects seed the key.
 *
 * Browsers are not installed by `npm ci`; CI runs
 * `npx playwright install --with-deps chromium` in the e2e job.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "phone-dark",
      use: { viewport: { width: 360, height: 640 } },
    },
    {
      name: "phone-light",
      use: {
        viewport: { width: 360, height: 640 },
        localStorage: [{ name: "ohkolab:theme", value: "light" }],
      },
    },
    {
      name: "desktop-dark",
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: "desktop-light",
      use: {
        viewport: { width: 1280, height: 800 },
        localStorage: [{ name: "ohkolab:theme", value: "light" }],
      },
    },
  ],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
