import { useCallback, useEffect, useSyncExternalStore } from "react";

import { getAbility } from "@/data/abilities";
import { toID } from "@/data/gen";
import { getItem } from "@/data/items";
import { getMove } from "@/data/moves";
import { getNature } from "@/data/natures";
import { getSpecies } from "@/data/species";
import { useLocale, type Locale } from "@/lib/i18n/locale";
import { TYPE_NAMES } from "@/types/pokemon";

/** The kinds of names the Japanese data covers; the JSON's section names. */
export type NameKind =
  "species" | "move" | "ability" | "item" | "type" | "nature";

/** The kinds that also carry a Japanese flavour-text description. */
export type DescriptionKind = "ability" | "item";

/** The shape of `@/data/i18n/ja-names.json`, keyed by `@/data` ids. */
export interface JapaneseNames {
  species: Record<string, string>;
  move: Record<string, string>;
  ability: Record<string, string>;
  item: Record<string, string>;
  type: Record<string, string>;
  nature: Record<string, string>;
  /** Japanese flavour text, only where PokéAPI has any (most-recent game). */
  abilityDescription: Record<string, string>;
  itemDescription: Record<string, string>;
}

let names: JapaneseNames | undefined;
let pending: Promise<void> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isLoaded(): boolean {
  return names !== undefined;
}

/**
 * Loads the Japanese names, once, from their own chunk. This is the only
 * trigger, so the JSON is fetched purely on demand: the app stays on the
 * English names until the locale is "ja". If the import fails the names
 * stay English; callers that need to know can catch the promise.
 */
export function loadJapaneseNames(): Promise<void> {
  pending ??= import("@/data/i18n/ja-names.json").then((module) => {
    names = module.default;
    for (const listener of listeners) listener();
  });
  return pending;
}

/** The English name (the Pokémon library name) a roster id stands for. */
function rosterEnglishName(kind: NameKind, id: string): string {
  const key = toID(id);
  switch (kind) {
    case "species":
      return getSpecies(key)?.name ?? id;
    case "move":
      return getMove(key)?.name ?? id;
    case "ability":
      return getAbility(key)?.name ?? id;
    case "item":
      return getItem(key)?.name ?? id;
    case "type":
      return TYPE_NAMES.find((name) => toID(name) === key) ?? id;
    case "nature":
      return getNature(key)?.name ?? id;
  }
}

/**
 * A roster entry's display name in a locale: the Japanese name when the
 * locale is "ja" and the names are loaded, otherwise the English name —
 * also for "ja" until the chunk arrives, so no name ever renders blank.
 * Everything internal (ids, Showdown import/export) stays English.
 */
export function displayName(
  kind: NameKind,
  id: string,
  locale: Locale,
): string {
  const english = rosterEnglishName(kind, id);
  if (locale !== "ja" || names === undefined) return english;
  return names[kind][toID(id)] ?? english;
}

/** Whether the Japanese names are available in this session yet. */
export function useJapaneseNames(): boolean {
  return useSyncExternalStore(subscribe, isLoaded, () => false);
}

/**
 * `displayName` for React: tracks the active locale, loads the Japanese
 * names once it is "ja", and re-renders when the chunk arrives. The
 * returned function reads the names at call time, so one render after
 * the load is enough.
 */
export function useDisplayName(): (kind: NameKind, id: string) => string {
  const [locale] = useLocale();
  // Re-render when the Japanese names finish loading.
  useSyncExternalStore(subscribe, isLoaded, () => false);
  useEffect(() => {
    if (locale === "ja") void loadJapaneseNames().catch(() => {});
  }, [locale]);
  return useCallback(
    (kind: NameKind, id: string) => displayName(kind, id, locale),
    [locale],
  );
}

/** The English short description a roster id stands for. */
function rosterEnglishDescription(kind: DescriptionKind, id: string): string {
  const key = toID(id);
  if (kind === "ability") return getAbility(key)?.shortDesc ?? "";
  return getItem(key)?.shortDesc ?? "";
}

/**
 * An ability's or item's short description in a locale: the Japanese
 * flavour text when the locale is "ja" and the chunk is loaded, otherwise
 * the English `shortDesc` — also for "ja" until the chunk arrives, and
 * for the entries PokéAPI has no Japanese text for (a handful of
 * Champions-only abilities and Mega Stones).
 */
export function displayDescription(
  kind: DescriptionKind,
  id: string,
  locale: Locale,
): string {
  const english = rosterEnglishDescription(kind, id);
  if (locale !== "ja" || names === undefined) return english;
  const section =
    kind === "ability" ? names.abilityDescription : names.itemDescription;
  return section[toID(id)] ?? english;
}

/**
 * `displayDescription` for React, mirroring `useDisplayName`: loads the
 * Japanese chunk once the locale is "ja" and re-renders when it arrives.
 */
export function useDisplayDescription(): (
  kind: DescriptionKind,
  id: string,
) => string {
  const [locale] = useLocale();
  // Re-render when the Japanese names finish loading.
  useSyncExternalStore(subscribe, isLoaded, () => false);
  useEffect(() => {
    if (locale === "ja") void loadJapaneseNames().catch(() => {});
  }, [locale]);
  return useCallback(
    (kind: DescriptionKind, id: string) => displayDescription(kind, id, locale),
    [locale],
  );
}

/**
 * Folds text for search: NFKC turns half-width katakana (ｶﾞ) and
 * full-width Latin (Ｘ) into their plain forms, NFD turns accented Latin
 * (é) into base letters, and everything that is neither alphanumerical
 * nor kana/kanji is dropped. Kana/kanji have no case, and NFD decomposes
 * voiced kana into base + voiced mark, so both sides must go through
 * this exact same pipeline for substrings to line up.
 */
export function normalizeForNameSearch(text: string): string {
  return text
    .normalize("NFKC")
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9぀-ヿ㐀-鿿豈-﫿]+/g, "");
}

/**
 * Whether a query matches an entry's English or Japanese display name:
 * case-insensitively for Latin, as a plain substring for kana and
 * kanji, with half-width katakana matching full-width (ｶﾞﾌﾞﾘｱｽ matches
 * ガブリアス). An empty query matches everything.
 */
export function matchesDisplayName(
  query: string,
  englishName: string,
  japaneseName?: string | null,
): boolean {
  const needle = normalizeForNameSearch(query);
  if (needle === "") return true;
  if (normalizeForNameSearch(japaneseName ?? "").includes(needle)) return true;
  return normalizeForNameSearch(englishName).includes(needle);
}
