import { calcStats } from "@/data";
import { battleSet } from "@/lib/calc/battle";
import {
  MAX_STAGE,
  MIN_STAGE,
  type CalcState,
  type SideId,
} from "@/lib/calc/state";
import type { Terrain, Weather } from "@/types/battle";

/**
 * Speed arithmetic, following the games: the stage multiplies the stat first,
 * the other modifiers are chained as 4096ths, paralysis halves the result.
 */

export interface SpeedInput {
  /** The Speed stat before any battle modifier. */
  stat: number;
  /** Stat stage, -6 to +6. */
  stage?: number;
  tailwind?: boolean;
  paralyzed?: boolean;
  choiceScarf?: boolean;
  ironBall?: boolean;
  /** An ability that doubles Speed is active (Swift Swim in rain...). */
  abilityDoubles?: boolean;
  /** Quick Feet with a status: 1.5x Speed and no paralysis drop. */
  quickFeet?: boolean;
}

/** A stat after its stage: x(2+n)/2 when raised, x2/(2+n) when lowered. */
export function applyStage(stat: number, stage: number): number {
  const clamped = Math.min(MAX_STAGE, Math.max(MIN_STAGE, Math.trunc(stage)));
  return clamped >= 0
    ? Math.floor((stat * (2 + clamped)) / 2)
    : Math.floor((stat * 2) / (2 - clamped));
}

const DOUBLE = 8192;
const ONE_AND_A_HALF = 6144;
const HALF = 2048;

/** The games round a product down at exactly one half. */
function pokeRound(value: number): number {
  return value % 1 > 0.5 ? Math.ceil(value) : Math.floor(value);
}

/** Final Speed after stage, field, item, ability and status. */
export function finalSpeed(input: SpeedInput): number {
  const modifiers: number[] = [];
  if (input.tailwind) modifiers.push(DOUBLE);
  if (input.abilityDoubles) modifiers.push(DOUBLE);
  else if (input.quickFeet) modifiers.push(ONE_AND_A_HALF);
  if (input.choiceScarf) modifiers.push(ONE_AND_A_HALF);
  else if (input.ironBall) modifiers.push(HALF);

  let chained = 4096;
  for (const modifier of modifiers) {
    chained = (chained * modifier + 2048) >> 12;
  }

  let speed = applyStage(input.stat, input.stage ?? 0);
  speed = pokeRound((speed * chained) / 4096);
  if (input.paralyzed && !input.quickFeet) speed = Math.floor(speed / 2);
  return Math.min(10000, Math.max(0, speed));
}

/** Abilities that double Speed under a weather or terrain. */
const WEATHER_SPEED_ABILITIES: Record<string, Weather> = {
  Chlorophyll: "Sun",
  "Swift Swim": "Rain",
  "Sand Rush": "Sand",
  "Slush Rush": "Snow",
};
const TERRAIN_SPEED_ABILITIES: Record<string, Terrain> = {
  "Surge Surfer": "Electric",
};

export interface SideSpeed {
  /** The Speed stat of the forme in battle, before modifiers. */
  stat: number;
  /** Speed after every modifier. */
  final: number;
  /** What changed the stat, in words, e.g. ["+1", "Tailwind"]. */
  modifiers: string[];
}

/** Final Speed of one side of the calculator, with what modifies it. */
export function sideSpeed(state: CalcState, id: SideId): SideSpeed {
  const side = state.sides[id];
  const set = battleSet(side);
  const stat = calcStats(set).spe;
  const ability = set.ability ?? "";

  const stage = side.boosts.spe;
  const tailwind = state.fieldSides[id].tailwind;
  const abilityDoubles =
    (state.weather !== null &&
      WEATHER_SPEED_ABILITIES[ability] === state.weather) ||
    (state.terrain !== null &&
      TERRAIN_SPEED_ABILITIES[ability] === state.terrain);
  const quickFeet = ability === "Quick Feet" && side.status !== null;
  const choiceScarf = set.item === "Choice Scarf";
  const ironBall = set.item === "Iron Ball";
  const paralyzed = side.status === "par";

  const modifiers: string[] = [];
  if (stage !== 0) modifiers.push(stage > 0 ? `+${stage}` : `${stage}`);
  if (tailwind) modifiers.push("Tailwind");
  if (abilityDoubles || quickFeet) modifiers.push(ability);
  if (choiceScarf) modifiers.push("Choice Scarf");
  if (ironBall) modifiers.push("Iron Ball");
  if (paralyzed && !quickFeet) modifiers.push("paralysis");

  return {
    stat,
    final: finalSpeed({
      stat,
      stage,
      tailwind,
      paralyzed,
      choiceScarf,
      ironBall,
      abilityDoubles,
      quickFeet,
    }),
    modifiers,
  };
}

/** The side that moves first at equal priority, or "tie". */
export function fasterSide(speeds: Record<SideId, number>): SideId | "tie" {
  if (speeds.p1 === speeds.p2) return "tie";
  return speeds.p1 > speeds.p2 ? "p1" : "p2";
}
