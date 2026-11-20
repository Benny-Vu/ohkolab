import type { TranslationKey } from "@/lib/i18n/en";
import type { TranslationParams } from "@/lib/i18n/t";
import type { StatId } from "@/types/pokemon";

/** What `useT()` returns, as a type lib- and feature-level helpers can take. */
export type Translate = (
  key: TranslationKey,
  params?: TranslationParams,
) => string;

/**
 * Stat labels as translation keys. `STAT_LABELS` in `@/types/pokemon` stays
 * English (other features use it); the tools features display these instead.
 */
const STAT_LABEL_KEYS: Record<StatId, TranslationKey> = {
  hp: "calc.statHp",
  atk: "calc.statAtk",
  def: "calc.statDef",
  spa: "calc.statSpa",
  spd: "calc.statSpd",
  spe: "calc.statSpe",
};

/** The localized short label of one stat (HP, 攻撃, ...). */
export function statLabel(t: Translate, stat: StatId): string {
  return t(STAT_LABEL_KEYS[stat]);
}
