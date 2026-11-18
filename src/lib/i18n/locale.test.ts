import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The store caches the locale at module level, so every test imports a fresh
 * copy of the module (vi.resetModules + a dynamic import) after clearing
 * local storage.
 */

async function freshStore() {
  const store = await import("@/lib/i18n/locale");
  return store;
}

describe("locale store", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("picks ja when the browser language is Japanese", async () => {
    vi.stubGlobal("navigator", { language: "ja-JP" });
    const { detectLocale, getLocale } = await freshStore();
    expect(detectLocale()).toBe("ja");
    expect(getLocale()).toBe("ja");
  });

  it("picks ja for a plain ja language tag", async () => {
    vi.stubGlobal("navigator", { language: "ja" });
    const { detectLocale } = await freshStore();
    expect(detectLocale()).toBe("ja");
  });

  it("picks en for every other browser language", async () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    const { getLocale } = await freshStore();
    expect(getLocale()).toBe("en");
  });

  it("keeps an explicit choice over the browser language", async () => {
    vi.stubGlobal("navigator", { language: "ja-JP" });
    const { getLocale, setLocale } = await freshStore();
    setLocale("en");
    expect(getLocale()).toBe("en");
    expect(localStorage.getItem("ohkolab:locale")).toBe("en");
  });

  it("restores a stored choice without consulting the browser", async () => {
    localStorage.setItem("ohkolab:locale", "ja");
    vi.stubGlobal("navigator", { language: "en-US" });
    const { getLocale } = await freshStore();
    expect(getLocale()).toBe("ja");
  });

  it("ignores an unknown stored value", async () => {
    localStorage.setItem("ohkolab:locale", "fr");
    vi.stubGlobal("navigator", { language: "en-US" });
    const { getLocale } = await freshStore();
    expect(getLocale()).toBe("en");
  });

  it("mirrors the locale onto <html lang>", async () => {
    const { applyDocumentLanguage, initLocale, setLocale } = await freshStore();
    setLocale("ja");
    expect(document.documentElement.lang).toBe("ja");
    setLocale("en");
    expect(document.documentElement.lang).toBe("en");
    // A fresh page load: the DOM tag starts stale and initLocale syncs it.
    document.documentElement.lang = "ja";
    initLocale();
    expect(document.documentElement.lang).toBe("en");
    applyDocumentLanguage("ja");
    expect(document.documentElement.lang).toBe("ja");
  });
});
