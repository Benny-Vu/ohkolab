import { useSyncExternalStore } from "react";

import type { TranslationKey } from "@/lib/i18n/en";
import { shellEn } from "@/lib/i18n/entries/shell";

/**
 * The English dictionary, split like the Japanese one: the shell strings sit
 * in the entry bundle (every page renders inside the app shell, and the entry
 * graph must never show a raw key), while each feature domain loads lazily
 * with its route. Until an overlay arrives, lookups for its keys fall back to
 * the raw key via the `t()` fallback chain — which is why every route calls
 * `ensureEnglishDomain` for the domains its pages touch before rendering.
 * This mirrors `@/lib/i18n/ja-loader`.
 */

/** The feature domains whose strings load with their routes. */
export type EnglishDomain =
  "community" | "account" | "tools" | "battles" | "learn";

type EnglishDictionary = Partial<Record<TranslationKey, string>>;

/** The active dictionary: the shell strings plus every loaded overlay. */
const dictionary: EnglishDictionary = { ...shellEn };
const loadedDomains = new Set<EnglishDomain>();
const pending = new Map<EnglishDomain, Promise<void>>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** How many overlays have landed; changes whenever a new one arrives. */
function loadedCount(): number {
  return loadedDomains.size;
}

/** The dynamic chunk behind each domain. */
const DOMAIN_CHUNKS: Record<EnglishDomain, () => Promise<EnglishDictionary>> = {
  community: () =>
    import("@/lib/i18n/entries/community").then((m) => m.communityEn),
  account: () => import("@/lib/i18n/entries/account").then((m) => m.accountEn),
  tools: () => import("@/lib/i18n/entries/tools").then((m) => m.toolsEn),
  battles: () => import("@/lib/i18n/entries/battles").then((m) => m.battlesEn),
  learn: () => import("@/lib/i18n/entries/learn").then((m) => m.learnEn),
};

/**
 * Loads a feature's English strings, once per domain. Routes call this in
 * their `lazy` loader so the strings are in place before the page renders.
 * Idempotent: an in-flight load is shared, a landed one resolves at once, and
 * a failed one is retried on the next call.
 */
export function ensureEnglishDomain(domain: EnglishDomain): Promise<void> {
  if (loadedDomains.has(domain)) return Promise.resolve();
  const inFlight = pending.get(domain);
  if (inFlight) return inFlight;
  const load = DOMAIN_CHUNKS[domain]()
    .then((overlay) => {
      Object.assign(dictionary, overlay);
      loadedDomains.add(domain);
      pending.delete(domain);
      notify();
    })
    .catch((error: unknown) => {
      pending.delete(domain);
      throw error;
    });
  pending.set(domain, load);
  return load;
}

/**
 * Registers a domain synchronously. Tests use this to preload the fresh
 * loader instances that `vi.resetModules` creates; production always goes
 * through `ensureEnglishDomain`.
 */
export function registerEnglishDomain(
  domain: EnglishDomain,
  overlay: EnglishDictionary,
): void {
  Object.assign(dictionary, overlay);
  loadedDomains.add(domain);
  notify();
}

/**
 * The English template for a key, or undefined while its domain is still on
 * the way (the caller falls back to the raw key, or to English when the
 * Japanese dictionary knows the key).
 */
export function englishTemplate(key: TranslationKey): string | undefined {
  return dictionary[key];
}

/**
 * The number of loaded overlays, as React state: the value changes whenever a
 * domain lands, so `useT` re-renders the components that need its strings.
 */
export function useEnglishDictionary(): number {
  return useSyncExternalStore(subscribe, loadedCount, () => 0);
}
