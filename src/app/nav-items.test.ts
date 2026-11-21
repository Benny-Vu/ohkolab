import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * NAV_ITEMS and MORE_ITEMS are decided at module load, so each test
 * re-imports them fresh (vi.resetModules) under its own flag values.
 */
async function loadNavItems() {
  vi.resetModules();
  return import("@/app/nav-items");
}

describe("NAV_ITEMS", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps the main destinations at five, with no Messages or Battles", async () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    vi.stubEnv("VITE_BATTLES", "true");
    const { NAV_ITEMS } = await loadNavItems();
    expect(NAV_ITEMS.map((item) => item.to)).toEqual([
      "/",
      "/calc",
      "/teams",
      "/meta",
      "/profile",
    ]);
  });
});

describe("MORE_ITEMS", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("always holds Notes, plus Battles only while the flag is on", async () => {
    vi.stubEnv("VITE_BATTLES", "");
    const { MORE_ITEMS } = await loadNavItems();
    expect(MORE_ITEMS.map((item) => item.to)).toEqual(["/notes"]);
    expect(MORE_ITEMS[0]!.labelKey).toBe("nav.notes");
  });

  it("adds Battles with the flag on", async () => {
    vi.stubEnv("VITE_BATTLES", "true");
    const { MORE_ITEMS } = await loadNavItems();
    const battles = MORE_ITEMS.find((item) => item.to === "/battles");
    expect(battles?.labelKey).toBe("nav.battles");
  });

  it("has no Messages item while the flag is off", async () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
    const { MORE_ITEMS } = await loadNavItems();
    expect(MORE_ITEMS.some((item) => item.to === "/messages")).toBe(false);
  });

  it("adds the Messages item with its badge while the flag is on", async () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const { MORE_ITEMS } = await loadNavItems();
    const messages = MORE_ITEMS.find((item) => item.to === "/messages");
    expect(messages).toBeDefined();
    expect(messages!.labelKey).toBe("nav.messages");
    expect(messages!.badge).toBe("messages");
  });
});
