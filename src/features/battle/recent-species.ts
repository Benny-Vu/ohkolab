import { useCallback, useSyncExternalStore } from "react";

/**
 * The opponent slots' recent picks, in local storage: the six species the
 * player picks most often, newest first. Small on purpose — a convenience
 * for the next match, not a history feature.
 */

const STORAGE_KEY = "ohkolab:battle:recent-species";
const LIMIT = 6;

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const names = parsed.filter(
      (name): name is string => typeof name === "string",
    );
    return [...new Set(names)].slice(0, LIMIT);
  } catch {
    // Blocked or corrupted storage: start with no picks.
    return [];
  }
}

/**
 * The cached snapshot. Always a distinct array per change (never a mutation),
 * so `useSyncExternalStore` sees a new object and re-renders.
 */
let cache: string[] | null = null;

function current(): string[] {
  cache ??= readStored();
  return cache;
}

function writeStored(next: string[]): void {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Blocked storage: the choice still holds for this session.
  }
}

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

/** The recent picks, newest first. */
export function listRecentSpecies(): string[] {
  return current();
}

/** Puts a species at the front of the recent picks. */
export function rememberSpecies(species: string): void {
  const next = [species, ...current().filter((name) => name !== species)];
  writeStored(next.slice(0, LIMIT));
  notify();
}

/** Drops one species from the recent picks. */
export function forgetSpecies(species: string): void {
  writeStored(current().filter((name) => name !== species));
  notify();
}

/** The snapshot before the store has read anything (tests, first paint). */
const EMPTY: string[] = [];

/** The recent picks as React state, newest first. */
export function useRecentSpecies(): {
  recent: string[];
  remember: (species: string) => void;
} {
  const recent = useSyncExternalStore(subscribe, current, () => EMPTY);
  const remember = useCallback(
    (species: string) => rememberSpecies(species),
    [],
  );
  return { recent, remember };
}
