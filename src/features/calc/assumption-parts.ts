import { calcSideLabel } from "@/features/calc/side-labels";
import { setSourceText } from "@/features/calc/set-source-text";
import {
  ALL_SIDE_FLAGS,
  TERRAIN_LABEL_KEYS,
  WEATHER_LABEL_KEYS,
  type DisplayName,
} from "@/features/calc/field-labels";
import type { Translate } from "@/components/stat-labels";
import { SIDE_IDS, type CalcState, type SetOrigin } from "@/lib/calc/state";

/**
 * What one damage result took for granted, as a quiet line of muted text:
 * the defender's set source, every field toggle that is on, and "Level 50".
 * Pure given the translators, so it stays testable without a render.
 */
export function assumptionParts(
  state: CalcState,
  origin: SetOrigin,
  t: Translate,
  displayName: DisplayName,
): string[] {
  const parts = [setSourceText(origin, t)];

  if (state.weather) parts.push(t(WEATHER_LABEL_KEYS[state.weather]));
  if (state.terrain) parts.push(t(TERRAIN_LABEL_KEYS[state.terrain]));

  for (const id of SIDE_IDS) {
    const conditions = state.fieldSides[id];
    const sideLabel = calcSideLabel(t, id);
    for (const { flag, label, kind } of ALL_SIDE_FLAGS) {
      if (conditions[flag]) {
        parts.push(`${displayName(kind, label)} (${sideLabel})`);
      }
    }
    if (conditions.spikes > 0) {
      parts.push(
        `${displayName("move", "Spikes")} ×${conditions.spikes} (${sideLabel})`,
      );
    }
  }

  if (state.gravity) parts.push(displayName("move", "Gravity"));
  if (state.trickRoom) parts.push(displayName("move", "Trick Room"));
  parts.push(t("calc.level50"));
  return parts;
}
