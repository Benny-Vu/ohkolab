import { MAX_SP_TOTAL, totalStatPoints } from "@/data";
import { STAT_IDS, type StatId, type StatsTable } from "@/types/pokemon";

/**
 * Trims excess Stat Points from the fullest stats until the total is
 * legal (66). Imported spreads are presentations, not the player's own
 * build, so a set that comes out over-budget is brought into budget
 * rather than shown broken.
 */
export function clampStatPoints(statPoints: StatsTable): StatsTable {
  const clamped = { ...statPoints };
  let total = totalStatPoints(clamped);
  while (total > MAX_SP_TOTAL) {
    let target: StatId = STAT_IDS[0];
    for (const id of STAT_IDS) {
      if (clamped[id] > clamped[target]) target = id;
    }
    if (clamped[target] <= 0) break;
    clamped[target] -= 1;
    total -= 1;
  }
  return clamped;
}
