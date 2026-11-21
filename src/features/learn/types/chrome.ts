import type { LocalizedText } from "@/features/learn/guides";

/**
 * The Types page's chrome strings. LEAD: these belong in
 * `@/lib/i18n/entries/learn` as `learn.types.*` keys with these exact EN
 * and JA twins (the types stream reports the request; it must not edit the
 * i18n files). Until then this local map is the single place they live —
 * swap `typesChrome()` calls for `t()` once the keys exist.
 */
const TYPES_CHROME = {
  "learn.types.attacking": { en: "Attacking", ja: "攻撃側" },
  "learn.types.defending": { en: "Defending", ja: "防御側" },
  "learn.types.superEffective": {
    en: "Super effective against",
    ja: "効果抜群",
  },
  "learn.types.notVeryEffective": {
    en: "Not very effective against",
    ja: "効果いまひとつ",
  },
  "learn.types.noEffect": { en: "No effect on", ja: "効かない" },
  "learn.types.weakTo": { en: "Weak to", ja: "弱点" },
  "learn.types.resists": { en: "Resists", ja: "軽減" },
  "learn.types.immuneTo": { en: "Immune to", ja: "無効" },
  "learn.types.traits": { en: "Traits", ja: "特徴" },
  "learn.types.chartGuide": {
    en: "Rows attack, columns defend.",
    ja: "行は攻撃側、列は防御側。",
  },
  "learn.types.legendSuper": { en: "Super effective", ja: "効果抜群" },
  "learn.types.legendResist": {
    en: "Not very effective",
    ja: "効果いまひとつ",
  },
  "learn.types.legendNoEffect": { en: "No effect", ja: "効かない" },
} as const satisfies Record<string, LocalizedText>;

export type TypesChromeKey = keyof typeof TYPES_CHROME;

/** One chrome string in a locale, English fallback like `localized()`. */
export function typesChrome(key: TypesChromeKey, locale: string): string {
  const text = TYPES_CHROME[key];
  return locale === "ja" ? text.ja : text.en;
}
