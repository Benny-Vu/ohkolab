import { describe, expect, it, vi } from "vitest";

import { englishTemplate } from "@/lib/i18n/en-loader";

/**
 * The English dictionary loader: the shell strings are part of the loader
 * module itself, and the feature domains register as overlays. The test
 * setup registers all domains on the shared instance; the load-path tests
 * below reset the registry and exercise `ensureEnglishDomain` against a
 * fresh loader, exactly like a production route does.
 */

describe("English dictionary loader", () => {
  it("serves the shell strings without any load", () => {
    expect(englishTemplate("nav.home")).toBe("Home");
  });

  it("serves the keys of the domains the setup registered", () => {
    expect(englishTemplate("calc.attacker")).toBe("Attacker");
    expect(englishTemplate("login.email")).toBe("Email");
    expect(englishTemplate("home.latest")).toBe("Latest");
  });

  it("falls back to undefined for keys of domains not yet loaded", async () => {
    vi.resetModules();
    const fresh = await import("@/lib/i18n/en-loader");
    expect(fresh.englishTemplate("nav.home")).toBe("Home");
    expect(fresh.englishTemplate("calc.attacker")).toBeUndefined();
  });

  it("loads a domain once and shares in-flight loads", async () => {
    vi.resetModules();
    const fresh = await import("@/lib/i18n/en-loader");
    const first = fresh.ensureEnglishDomain("tools");
    const second = fresh.ensureEnglishDomain("tools");
    expect(second).toBe(first);
    await first;
    expect(fresh.englishTemplate("calc.attacker")).toBe("Attacker");
    // Already loaded: resolves at once, without a new import.
    await expect(fresh.ensureEnglishDomain("tools")).resolves.toBeUndefined();
  });

  it("translates through t() once the domain lands", async () => {
    vi.resetModules();
    const fresh = await import("@/lib/i18n/en-loader");
    const { t } = await import("@/lib/i18n/t");
    // Before the overlay arrives the raw key is the last-resort fallback.
    expect(t("calc.attacker")).toBe("calc.attacker");
    await fresh.ensureEnglishDomain("tools");
    expect(t("calc.attacker")).toBe("Attacker");
  });
});
