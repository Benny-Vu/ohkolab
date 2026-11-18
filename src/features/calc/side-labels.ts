import type { SideId } from "@/lib/calc/state";
import type { TranslationKey } from "@/lib/i18n/en";
import type { Translate } from "@/features/calc/stat-labels";

/** The calculator's own names for the two sides, as translation keys. */
export const CALC_SIDE_LABEL_KEYS: Record<SideId, TranslationKey> = {
  p1: "calc.attacker",
  p2: "calc.defender",
};

/** The localized name of one side of the calculator. */
export function calcSideLabel(t: Translate, side: SideId): string {
  return t(CALC_SIDE_LABEL_KEYS[side]);
}
