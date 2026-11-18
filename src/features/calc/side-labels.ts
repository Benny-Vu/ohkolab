import type { SideId } from "@/lib/calc/state";

/** The calculator's own names for the two sides. */
export const CALC_SIDE_LABELS: Record<SideId, string> = {
  p1: "Attacker",
  p2: "Defender",
};
