/** The row entrance classes for a staggered fade-and-rise. */
export const ROW_ENTRANCE =
  "animate-in fade-in slide-in-from-bottom-2 duration-(--motion-base) ease-(--motion-ease-out)";

/** The pause between two rows of a staggered entrance. */
export const ROW_STAGGER_MS = 40;

/** The most rows a stagger can spread over; later rows arrive together. */
const ROW_STAGGER_CAP = 7;

/**
 * The delay for the `index`-th row of a list: `40ms` apart, capped so a
 * long list still finishes within a beat. Late rows (an appended page)
 * therefore enter together rather than waiting out a long tail.
 */
export function staggerDelay(index: number): number {
  return Math.min(index, ROW_STAGGER_CAP) * ROW_STAGGER_MS;
}

/**
 * How lists stagger their rows in (`ROW_ENTRANCE` plus a `staggerDelay`),
 * keyed to the data, not to renders: rows are keyed by their item id, so a
 * row's element mounts exactly when its data arrives (the first load, a
 * new page, a route visit) — and a CSS animation plays once, on mount.
 * A plain re-render (a like toggling, a row marked read) never remounts
 * the element and so never replays the animation. No mount-flag state is
 * needed; React's keying is the flag.
 */
