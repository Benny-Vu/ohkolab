import { calcStats, createDefaultSet, getSpecies } from "@/data";
import { finalSpeed } from "@/lib/calc/speed";
import type { PokemonSet } from "@/types/pokemon";

/**
 * Speed notes: "faster / slower than one of mine" turned into a Speed
 * range for an opponent Pokémon, with a plain hint about what the range
 * implies for its nature and item. Pure maths and lookups only — the
 * panel owns the interactions, the store owns persistence.
 *
 * The relations bound the opponent's Speed STAT (what the set builder
 * and the hint reason about). The opponent is assumed unmodified: a
 * Scarf or Tailwind on their side is something the player notes as a
 * reveal, not something a relation can see.
 */

export type SpeedRelationKind = "faster" | "slower" | "tie";

/** The field at the moment a relation was observed. */
export interface SpeedFieldState {
  tailwindMine: boolean;
  /** Their Tailwind doubles their Speed: bounds halve back to the stat. */
  tailwindTheirs: boolean;
  trickRoom: boolean;
  paralyzedMine: boolean;
  scarfMine: boolean;
  /** My Pokémon's Speed stage at that moment, -6 to +6. */
  stageMine: number;
  /** The move the relation came from was a priority move. */
  priority: boolean;
}

/** One observed relation: "faster than my Pokémon, which sat at X". */
export interface SpeedRelation {
  id: string;
  kind: SpeedRelationKind;
  /** My Pokémon's species, as a roster name. */
  mineSpecies: string;
  /**
   * My Pokémon's Speed stat as noted (from its set, or typed by hand).
   * Null when unknown: the relation stays a plain note and carries no
   * bound.
   */
  mineSpeed: number | null;
  field: SpeedFieldState;
}

/** A Speed range: a lower and/or an upper bound, either may be open. */
export interface SpeedRange {
  min: number | null;
  max: number | null;
}

export const EMPTY_SPEED_FIELD: SpeedFieldState = {
  tailwindMine: false,
  tailwindTheirs: false,
  trickRoom: false,
  paralyzedMine: false,
  scarfMine: false,
  stageMine: 0,
  priority: false,
};

/** The stage multiplier's limits, for clamping what is stored. */
export const MAX_SPEED_STAGE = 6;
export const MIN_SPEED_STAGE = -6;

function clampStage(stage: number): number {
  if (!Number.isFinite(stage)) return 0;
  return Math.min(
    MAX_SPEED_STAGE,
    Math.max(MIN_SPEED_STAGE, Math.round(stage)),
  );
}

/** My Pokémon's Speed at the moment of the relation, from the noted stat. */
export function myNotedSpeed(relation: SpeedRelation): number | null {
  const base = relation.mineSpeed;
  if (base === null || base < 0) return null;
  return finalSpeed({
    stat: base,
    stage: clampStage(relation.field.stageMine),
    tailwind: relation.field.tailwindMine,
    paralyzed: relation.field.paralyzedMine,
    choiceScarf: relation.field.scarfMine,
  });
}

/**
 * The opponent Speed the relation implies, as one-sided bounds on their
 * stat. Trick Room reverses the meaning of "faster"; their Tailwind
 * halves the bound back into a stat. Returns null for ties on unknown
 * speeds and priority moves, which bound nothing.
 */
export function relationBounds(relation: SpeedRelation): SpeedRange | null {
  const mine = myNotedSpeed(relation);
  if (mine === null || relation.field.priority) return null;

  if (relation.kind === "tie") {
    const tie = halveUp(mine, relation.field.tailwindTheirs);
    return { min: tie, max: tie };
  }
  // Under Trick Room "faster" (moved first) means the lower Speed.
  const fasterGivesLower = !relation.field.trickRoom;
  const givesLower =
    relation.kind === "faster" ? fasterGivesLower : !fasterGivesLower;
  if (givesLower) {
    const bound = halveUp(mine + 1, relation.field.tailwindTheirs);
    return { min: bound, max: null };
  }
  const bound = halveDown(mine - 1, relation.field.tailwindTheirs);
  return { min: null, max: bound };
}

/** Their Tailwind doubles the stat: a lower bound rounds up when halved. */
function halveUp(value: number, tailwindTheirs: boolean): number {
  return tailwindTheirs ? Math.ceil(value / 2) : value;
}

/** An upper bound rounds down, so the bound stays true after doubling. */
function halveDown(value: number, tailwindTheirs: boolean): number {
  return tailwindTheirs ? Math.floor(value / 2) : value;
}

/**
 * All bounds together: the highest lower and the lowest upper. Relations
 * without a speed (plain notes) and priority moves do not narrow it.
 */
export function speedRange(relations: readonly SpeedRelation[]): SpeedRange {
  let min: number | null = null;
  let max: number | null = null;
  for (const relation of relations) {
    const bounds = relationBounds(relation);
    if (!bounds) continue;
    if (bounds.min !== null && (min === null || bounds.min > min)) {
      min = bounds.min;
    }
    if (bounds.max !== null && (max === null || bounds.max < max)) {
      max = bounds.max;
    }
  }
  return { min, max };
}

/** A range is contradictory when its bounds cross. */
export function rangeIsInconsistent(range: SpeedRange): boolean {
  return range.min !== null && range.max !== null && range.min > range.max;
}

// --- The hint: what the range says about nature and item. ---

/** The speed-boosting nature that fits the forme's attacking side. */
export function boostingNature(species: string): string {
  const stats = getSpecies(species)?.baseStats;
  if (!stats) return "Jolly/Timid";
  if (stats.atk > stats.spa) return "Jolly";
  if (stats.spa > stats.atk) return "Timid";
  return "Jolly/Timid";
}

/** The speed-lowering nature that fits the forme's attacking side. */
export function hinderingNature(species: string): string {
  const stats = getSpecies(species)?.baseStats;
  if (!stats) return "Brave/Quiet";
  if (stats.atk > stats.spa) return "Brave";
  if (stats.spa > stats.atk) return "Quiet";
  return "Brave/Quiet";
}

/** One named reading of a range, rendered through the dictionary. */
export type SpeedHint =
  | { kind: "inconsistent" }
  | { kind: "scarf" }
  | { kind: "boostMax"; nature: string }
  | { kind: "boostOrScarf"; nature: string }
  | { kind: "uninvested"; nature: string }
  /** Slower than its slowest spread: its Speed was lowered in battle. */
  | { kind: "slowed" }
  /** Faster than its fastest spread with a Scarf: a boost not in the notes. */
  | { kind: "boosted" };

function speciesStat(
  species: string,
  statPoints: number,
  nature: string,
): number {
  const info = getSpecies(species);
  if (!info) return 0;
  const spread: PokemonSet = {
    ...createDefaultSet(info.name),
    nature,
    statPoints: {
      hp: 0,
      atk: 0,
      def: 0,
      spa: 0,
      spd: 0,
      spe: statPoints,
    },
  };
  return calcStats(spread).spe;
}

/**
 * What the range implies about the opponent's nature and item, compared
 * with the speeds the species can actually reach at level 50: 0 to 32
 * Speed SP with a hindering, neutral or boosting nature. A lower bound
 * above every reachable stat means it must be Choice Scarfed. Bounds
 * outside even those extremes (below the slowest spread, above the
 * fastest one with a Scarf) mean the stat itself was modified mid-battle,
 * usually a Speed drop (Icy Wind, paralysis) or an unnoted boost, so the
 * hint says that instead of guessing a spread.
 */
export function speedHint(
  species: string,
  range: SpeedRange,
): SpeedHint | null {
  if (rangeIsInconsistent(range)) return { kind: "inconsistent" };
  const boost = boostingNature(species);
  const hinder = hinderingNature(species);
  const neutralMax = speciesStat(species, 32, "Serious");
  // Any +Speed nature reaches the same Speed; "Jolly" stands in for the
  // set of them when computing the maximum, and "Brave" for the -Speed
  // natures when computing the minimum.
  const boostMax = speciesStat(species, 32, "Jolly");
  const uninvestedMax = speciesStat(species, 0, "Serious");
  const hinderedMin = speciesStat(species, 0, "Brave");
  // Choice Scarf is x1.5 through the 4096 chain; with .0 or .5 fractions
  // its round-half-down equals a floor.
  const scarfMax = Math.floor(boostMax * 1.5);

  if (range.max !== null && range.max < hinderedMin) return { kind: "slowed" };
  if (range.min !== null && range.min > scarfMax) return { kind: "boosted" };
  if (range.min !== null && range.min > boostMax) return { kind: "scarf" };
  if (range.min !== null && range.min >= boostMax) {
    return { kind: "boostMax", nature: boost };
  }
  if (range.min !== null && range.min > neutralMax) {
    return { kind: "boostOrScarf", nature: boost };
  }
  if (range.max !== null && range.max <= uninvestedMax) {
    return { kind: "uninvested", nature: hinder };
  }
  return null;
}
