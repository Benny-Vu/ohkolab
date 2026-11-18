import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { en, type TranslationKey } from "@/lib/i18n/en";
import { ja } from "@/lib/i18n/ja";
import { setLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/t";

describe("dictionaries", () => {
  it("has every English key in the Japanese dictionary", () => {
    const enKeys = Object.keys(en).sort();
    const jaKeys = Object.keys(ja).sort();
    expect(jaKeys).toEqual(enKeys);
  });

  it("uses the same placeholders in English and Japanese for each key", () => {
    const placeholders = (template: string | undefined) =>
      JSON.stringify((template ?? "").match(/\{(\w+)\}/g)?.sort() ?? []);
    for (const key of Object.keys(en) as TranslationKey[]) {
      expect(placeholders(ja[key]), `placeholders of "${key}"`).toBe(
        placeholders(en[key] as string),
      );
    }
  });
});

describe("t()", () => {
  beforeEach(() => {
    setLocale("en");
  });

  afterEach(() => {
    setLocale("en");
  });

  it("translates in the active locale", () => {
    setLocale("en");
    expect(t("nav.home")).toBe("Home");
    setLocale("ja");
    expect(t("nav.home")).toBe("ホーム");
  });

  it("falls back to English for a missing Japanese key", () => {
    setLocale("ja");
    // Simulate a missing key without weakening the real dictionary.
    const sparse = ja as Partial<Record<TranslationKey, string>>;
    const key = "common.cancel" as TranslationKey;
    const saved = sparse[key];
    delete sparse[key];
    try {
      expect(t(key)).toBe("Cancel");
    } finally {
      sparse[key] = saved;
    }
  });

  it("replaces placeholders", () => {
    setLocale("en");
    expect(t("relative.minutesAgo", { n: 5 })).toBe("5m ago");
    setLocale("ja");
    expect(t("relative.minutesAgo", { n: 5 })).toBe("5分前");
  });

  it("leaves a placeholder without a value as-is", () => {
    setLocale("en");
    expect(t("relative.dateThisYear", { month: "Mar" })).toBe("Mar {day}");
  });
});
