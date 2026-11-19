import { useEffect, useState } from "react";

/**
 * How long a load may take before a skeleton is worth showing at all. Fast
 * loads (cached queries, quick round trips) finish inside this window and the
 * pending state never enters the DOM, so nothing flashes.
 */
export const SKELETON_DELAY_MS = 150;

/**
 * Keeps a pending state out of the DOM for a short grace window: stays false
 * until `delayMs` has elapsed while `isPending` holds, then stays true for as
 * long as the caller is pending. When the load finishes first the value never
 * turns true, and it falls back to false immediately (the next pending
 * period starts its own grace window, so switching tabs never flashes).
 */
export function useDelayedPending(
  isPending: boolean,
  delayMs: number = SKELETON_DELAY_MS,
): boolean {
  const [elapsed, setElapsed] = useState(false);

  // A finished load ends its grace window during render (the same "adjust
  // state on a change" pattern the metagame page uses for its month picker),
  // so the effect below only ever starts timers — never resets state.
  if (!isPending && elapsed) {
    setElapsed(false);
  }

  useEffect(() => {
    if (!isPending) {
      return;
    }
    const timer = window.setTimeout(() => setElapsed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [isPending, delayMs]);

  return isPending && elapsed;
}
