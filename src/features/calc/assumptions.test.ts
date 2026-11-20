import { describe, expect, it } from "vitest";

import { assumptionParts } from "@/features/calc/assumption-parts";
import {
  calcReducer,
  createDefaultCalcState,
  type CalcAction,
  type CalcState,
} from "@/lib/calc/state";
import type { Translate } from "@/components/stat-labels";
import type { TranslationKey } from "@/lib/i18n/en";
import type { TranslationParams } from "@/lib/i18n/t";

/** A translator that renders keys (and their params) verbatim. */
const t: Translate = (key: TranslationKey, params?: TranslationParams) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

/** A display-name function that passes roster names through unchanged. */
const displayName = (_kind: unknown, id: string) => id;

function reduce(state: CalcState, ...actions: CalcAction[]): CalcState {
  return actions.reduce(calcReducer, state);
}

describe("assumptionParts", () => {
  it("names the defender's set source and Level 50 and nothing else", () => {
    const parts = assumptionParts(
      createDefaultCalcState(),
      { kind: "custom" },
      t,
      displayName,
    );
    expect(parts).toEqual(["calc.setSourceCustom", "calc.level50"]);
  });

  it("spells a common set's source with its usage share", () => {
    const parts = assumptionParts(
      createDefaultCalcState(),
      { kind: "common", index: 1, speciesUsage: 0.356 },
      t,
      displayName,
    );
    expect(parts[0]).toBe('calc.setSourceCommon:{"usage":"35.6%"}');
    expect(parts).toContain("calc.level50");
  });

  it("lists every field toggle that is on, with the side it belongs to", () => {
    const state = reduce(
      createDefaultCalcState(),
      { type: "setWeather", weather: "Sun" },
      { type: "setTerrain", terrain: "Electric" },
      { type: "setSideFlag", side: "p2", flag: "reflect", on: true },
      { type: "setSideFlag", side: "p1", flag: "tailwind", on: true },
      { type: "setSpikes", side: "p2", layers: 2 },
      { type: "setGravity", on: true },
      { type: "setTrickRoom", on: true },
    );
    const parts = assumptionParts(state, { kind: "assumed" }, t, displayName);
    expect(parts).toEqual([
      "calc.setSourceAssumed",
      "calc.weatherSun",
      "calc.terrainElectric",
      "Tailwind (calc.attacker)",
      "Reflect (calc.defender)",
      "Spikes ×2 (calc.defender)",
      "Gravity",
      "Trick Room",
      "calc.level50",
    ]);
  });
});
