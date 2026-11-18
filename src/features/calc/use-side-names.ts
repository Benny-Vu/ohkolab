import { useDisplayName } from "@/data/display-names";
import { battleName } from "@/lib/calc/battle";
import type { CalcState, SideId } from "@/lib/calc/state";

/**
 * Each side's display name in the active locale: the Mega forme when the
 * side is Mega Evolved, numbered when both sides are the same forme. The
 * internal English names stay with `sideNames` in `@/lib/calc/battle`.
 */
export function useSideNames(state: CalcState): Record<SideId, string> {
  const displayName = useDisplayName();
  const p1 = displayName("species", battleName(state.sides.p1));
  const p2 = displayName("species", battleName(state.sides.p2));
  return p1 === p2 ? { p1: `${p1} (1)`, p2: `${p2} (2)` } : { p1, p2 };
}
