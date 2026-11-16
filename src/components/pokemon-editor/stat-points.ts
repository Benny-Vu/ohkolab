import { MAX_SP_PER_STAT, MAX_SP_TOTAL, totalStatPoints } from "@/data";
import type { StatId, StatsTable } from "@/types/pokemon";

/** Stat Points still unspent. Negative when a set is over the limit. */
export function remainingStatPoints(statPoints: StatsTable): number {
  return MAX_SP_TOTAL - totalStatPoints(statPoints);
}

/**
 * Puts `requested` Stat Points on one stat. The result respects both limits:
 * a request above the per-stat maximum, or above what the total cap leaves
 * free, is clamped down to the most that still fits. Returns the same table
 * when nothing changes.
 */
export function withStatPoints(
  statPoints: StatsTable,
  stat: StatId,
  requested: number,
): StatsTable {
  const current = statPoints[stat];
  const spentElsewhere = totalStatPoints(statPoints) - current;
  const ceiling = Math.max(
    0,
    Math.min(MAX_SP_PER_STAT, MAX_SP_TOTAL - spentElsewhere),
  );
  const wanted = Number.isFinite(requested) ? Math.trunc(requested) : 0;
  const next = Math.min(ceiling, Math.max(0, wanted));
  return next === current ? statPoints : { ...statPoints, [stat]: next };
}
