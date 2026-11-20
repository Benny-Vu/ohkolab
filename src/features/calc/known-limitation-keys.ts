import type { TranslationKey } from "@/lib/i18n/en";

/**
 * The honest gaps of this calculator, as one list in one place. Wording
 * stays conservative: only gaps verified against the app and
 * `@smogon/calc`'s Champions handling are named here.
 */
export const KNOWN_LIMITATION_KEYS: TranslationKey[] = [
  // Weather- and terrain-setting abilities (Drizzle, Drought, the surges)
  // are not switched on automatically.
  "calc.limitationWeather",
  // Only the damage roll is calculated; a move's added effects (flinches,
  // stat changes, secondary status) are not part of the result.
  "calc.limitationSecondary",
  // Recoil and self-damage are not shown; abilities such as Rock Head that
  // ignore recoil are not applied.
  "calc.limitationRecoil",
  // Move pools come from mainline learnsets filtered to the Champions move
  // list, so a rare move may be offered that Champions does not allow.
  "calc.limitationLearnsets",
];
