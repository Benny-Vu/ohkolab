import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * NAV_ITEMS is decided at module load, so each test re-imports it fresh
 * (vi.resetModules) under its own flag value.
 */
async function loadNavItems() {
  vi.resetModules();
  const module = await import("@/app/nav-items");
  return module.NAV_ITEMS;
}

describe("NAV_ITEMS", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("has no Messages item while the flag is off", async () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
    const items = await loadNavItems();
    expect(items.some((item) => item.to === "/messages")).toBe(false);
  });

  it("adds the Messages item with its badge while the flag is on", async () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const items = await loadNavItems();
    const messages = items.find((item) => item.to === "/messages");
    expect(messages).toBeDefined();
    expect(messages!.labelKey).toBe("nav.messages");
    expect(messages!.badge).toBe("messages");
  });
});
