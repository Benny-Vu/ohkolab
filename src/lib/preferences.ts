import { useSyncExternalStore } from "react";

import type { BattleFormat } from "@/types/battle";

/**
 * Small app-wide preferences kept in local storage. The battle format is
 * shared by the calc, team builder and metagame so they stay in step.
 */

const FORMAT_KEY = "ohkolab:format";
const DEFAULT_FORMAT: BattleFormat = "doubles";

const listeners = new Set<() => void>();

function readFormat(): BattleFormat {
  try {
    const stored = localStorage.getItem(FORMAT_KEY);
    return stored === "singles" || stored === "doubles"
      ? stored
      : DEFAULT_FORMAT;
  } catch {
    return DEFAULT_FORMAT;
  }
}

let currentFormat: BattleFormat | undefined;

export function getBattleFormat(): BattleFormat {
  currentFormat ??= readFormat();
  return currentFormat;
}

export function setBattleFormat(format: BattleFormat): void {
  currentFormat = format;
  try {
    localStorage.setItem(FORMAT_KEY, format);
  } catch {
    // Storage can be unavailable (private mode); the choice still holds for this session.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The preferred battle format and a setter, as React state. */
export function useBattleFormat(): [
  BattleFormat,
  (format: BattleFormat) => void,
] {
  const format = useSyncExternalStore(
    subscribe,
    getBattleFormat,
    () => DEFAULT_FORMAT,
  );
  return [format, setBattleFormat];
}
