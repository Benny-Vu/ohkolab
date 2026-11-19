import { useSyncExternalStore } from "react";

import type { TranslationKey } from "@/lib/i18n/en";
import type { ja } from "@/lib/i18n/ja";

/**
 * The Japanese dictionary loads lazily, from its own chunk: the entry bundle
 * only carries the English strings, and this module is the bridge. Until the
 * chunk arrives, lookups fall back to English (never raw keys, never blank);
 * `useT` re-renders the components once it lands. This mirrors the proven
 * pattern of `@/data/display-names` (`loadJapaneseNames`).
 */
type JaDictionary = typeof ja;

let dictionary: JaDictionary | undefined;
let pending: Promise<void> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isLoaded(): boolean {
  return dictionary !== undefined;
}

/**
 * Loads the Japanese dictionary, once. Kicked by `initLocale` on a Japanese
 * first start and by `setLocale("ja")` on a switch. If the import fails the
 * app stays on the English fallback; callers that need to know can catch.
 */
export function loadJapaneseDictionary(): Promise<void> {
  pending ??= import("@/lib/i18n/ja").then((module) => {
    dictionary = module.ja;
    for (const listener of listeners) listener();
  });
  return pending;
}

/**
 * The Japanese template for a key, or undefined while the chunk is still on
 * its way (the caller falls back to English). A key the dictionary itself
 * does not know also returns undefined, so the fallback covers it.
 */
export function japaneseTemplate(key: TranslationKey): string | undefined {
  return dictionary?.[key];
}

/** Whether the Japanese dictionary is available in this session yet. */
export function useJapaneseDictionary(): boolean {
  return useSyncExternalStore(subscribe, isLoaded, () => false);
}
