import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { TranslationKey } from "@/lib/i18n/en";
import { accountEn } from "@/lib/i18n/entries/account";
import { battlesEn } from "@/lib/i18n/entries/battles";
import { communityEn } from "@/lib/i18n/entries/community";
import { shellEn } from "@/lib/i18n/entries/shell";
import { toolsEn } from "@/lib/i18n/entries/tools";
import { ja } from "@/lib/i18n/ja";
import { setLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/t";
import { DEFAULT_TEAM_NAME } from "@/lib/team/team-ops";

/**
 * The full English dictionary, assembled the way the split loader does
 * (the shell statically plus every domain overlay): the parity checks
 * below need the complete key set.
 */
const en: Record<TranslationKey, string> = {
  ...shellEn,
  ...communityEn,
  ...accountEn,
  ...toolsEn,
  ...battlesEn,
};

describe("dictionaries", () => {
  it("has every English key in the Japanese dictionary", () => {
    const enKeys = Object.keys(en).sort();
    const jaKeys = Object.keys(ja).sort();
    expect(jaKeys).toEqual(enKeys);
  });

  it("keeps hard-coded display defaults in the dictionary", () => {
    // The stored sentinel for new teams is shown localized via
    // displayTeamName; this ties the constant to the dictionary so the
    // two cannot drift apart (the footer bug class, but for defaults).
    expect(en["teams.untitled"]).toBe(DEFAULT_TEAM_NAME);
  });

  it("uses the same placeholders in English and Japanese for each key", () => {
    const placeholders = (template: string | undefined) =>
      JSON.stringify((template ?? "").match(/\{(\w+)\}/g)?.sort() ?? []);
    for (const key of Object.keys(en) as TranslationKey[]) {
      expect(placeholders(ja[key]), `placeholders of "${key}"`).toBe(
        placeholders(en[key]),
      );
    }
  });

  it("translates every key whose Japanese value is not a known brand", () => {
    // Values that legitimately stay the same in both languages: brands, the
    // language endonyms (each language is named in its own tongue) and the
    // official stat name HP.
    const allowed = new Set([
      "OK",
      "OHKOLab",
      "Vu Forge",
      "Showdown",
      "English",
      "日本語",
      "HP",
      // "ID" is the ordinary Japanese word for an identifier badge, too.
      "ID",
      // Platform brand names: the Japanese uses the same branding.
      "YouTube",
      "Twitch",
    ]);
    // Keys whose English value is intentionally not English (or not shown in
    // the en locale at all).
    const allowedKeys = new Set(["legal.japaneseNotice"]);
    const untranslated: string[] = [];
    for (const key of Object.keys(en) as TranslationKey[]) {
      const english = en[key];
      if (allowed.has(english) || allowedKeys.has(key)) continue;
      if (ja[key] === english) untranslated.push(key);
    }
    expect(
      untranslated,
      "keys whose Japanese value is the English text",
    ).toEqual([]);
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
