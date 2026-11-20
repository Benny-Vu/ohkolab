import {
  DEFAULT_NATURE,
  getAbility,
  getItem,
  getMove,
  getNature,
  getSpecies,
  MAX_SP_PER_STAT,
} from "@/data";
import {
  createDefaultCalcState,
  MAX_HP_PERCENT,
  MAX_COMMON_SETS,
  MAX_SPIKES,
  MAX_STAGE,
  megaFormeOf,
  MIN_HP_PERCENT,
  MIN_STAGE,
  MOVE_SLOTS,
  SIDE_IDS,
  type CalcSide,
  type CalcState,
  type CritFlags,
  type MoveSelection,
  type SetOrigin,
  type SideId,
} from "@/lib/calc/state";
import {
  STATUS_NAMES,
  TERRAINS,
  WEATHERS,
  type BoostTable,
  type SideState,
} from "@/types/battle";
import {
  STAT_IDS,
  type Gender,
  type PokemonSet,
  type StatsTable,
} from "@/types/pokemon";

/**
 * Reading and writing the calculator state in local storage, and reading the
 * sets another page hands over. Everything read is untrusted: each part is
 * checked and falls back to its default when it is missing or malformed.
 */

export const CALC_STORAGE_KEY = "ohkolab:calc";
const STORAGE_VERSION = 1;

type Unknown = Record<string, unknown>;

function isRecord(value: unknown): value is Unknown {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function intInRange(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function oneOf<T extends string>(
  value: unknown,
  options: readonly T[],
): T | null {
  return options.find((option) => option === value) ?? null;
}

/** A valid set from unknown data, or null when it names no Champions species. */
export function parsePokemonSet(raw: unknown): PokemonSet | null {
  if (!isRecord(raw) || typeof raw.species !== "string") return null;
  const species = getSpecies(raw.species);
  if (!species) return null;

  const points = isRecord(raw.statPoints) ? raw.statPoints : {};
  const statPoints = {} as StatsTable;
  for (const stat of STAT_IDS) {
    statPoints[stat] = intInRange(points[stat], 0, MAX_SP_PER_STAT, 0);
  }

  const rawMoves = Array.isArray(raw.moves) ? raw.moves : [];
  const moves = MOVE_SLOTS.map((slot) => {
    const move: unknown = rawMoves[slot];
    return typeof move === "string" ? (getMove(move)?.name ?? null) : null;
  }) as PokemonSet["moves"];

  const ability =
    typeof raw.ability === "string" ? getAbility(raw.ability)?.name : undefined;

  const set: PokemonSet = {
    species: species.name,
    item:
      typeof raw.item === "string" ? (getItem(raw.item)?.name ?? null) : null,
    ability: ability ?? species.abilities[0] ?? null,
    nature:
      typeof raw.nature === "string"
        ? (getNature(raw.nature)?.name ?? DEFAULT_NATURE)
        : DEFAULT_NATURE,
    statPoints,
    moves,
  };
  if (typeof raw.nickname === "string" && raw.nickname.trim()) {
    set.nickname = raw.nickname;
  }
  const gender = oneOf<Gender>(raw.gender, ["M", "F", "N"]);
  if (gender) set.gender = gender;
  return set;
}

/**
 * The sets in router state shaped like `CalcHandoff`, keyed by calculator
 * side (attacker is Pokémon 1). Null when the state carries no usable set.
 */
export function parseHandoff(
  raw: unknown,
): Partial<Record<SideId, PokemonSet>> | null {
  if (!isRecord(raw)) return null;
  const sets: Partial<Record<SideId, PokemonSet>> = {};
  const attacker = parsePokemonSet(raw.attacker);
  const defender = parsePokemonSet(raw.defender);
  if (attacker) sets.p1 = attacker;
  if (defender) sets.p2 = defender;
  return attacker || defender ? sets : null;
}

function parseSide(raw: unknown, fallback: CalcSide): CalcSide {
  if (!isRecord(raw)) return fallback;
  const set = parsePokemonSet(raw.set);
  if (!set) return fallback;

  const rawBoosts = isRecord(raw.boosts) ? raw.boosts : {};
  const boosts: BoostTable = {
    atk: intInRange(rawBoosts.atk, MIN_STAGE, MAX_STAGE, 0),
    def: intInRange(rawBoosts.def, MIN_STAGE, MAX_STAGE, 0),
    spa: intInRange(rawBoosts.spa, MIN_STAGE, MAX_STAGE, 0),
    spd: intInRange(rawBoosts.spd, MIN_STAGE, MAX_STAGE, 0),
    spe: intInRange(rawBoosts.spe, MIN_STAGE, MAX_STAGE, 0),
  };
  const rawCrits = Array.isArray(raw.crits) ? raw.crits : [];

  return {
    set,
    boosts,
    status: oneOf(raw.status, STATUS_NAMES),
    hpPercent: intInRange(
      raw.hpPercent,
      MIN_HP_PERCENT,
      MAX_HP_PERCENT,
      MAX_HP_PERCENT,
    ),
    mega: raw.mega === true && megaFormeOf(set) !== null,
    crits: MOVE_SLOTS.map((slot) => rawCrits[slot] === true) as CritFlags,
  };
}

function parseFieldSide(raw: unknown): SideState {
  const side = isRecord(raw) ? raw : {};
  return {
    reflect: side.reflect === true,
    lightScreen: side.lightScreen === true,
    auroraVeil: side.auroraVeil === true,
    tailwind: side.tailwind === true,
    helpingHand: side.helpingHand === true,
    friendGuard: side.friendGuard === true,
    stealthRock: side.stealthRock === true,
    spikes: intInRange(side.spikes, 0, MAX_SPIKES, 0),
  };
}

/**
 * A set origin from unknown data. Anything malformed falls back to
 * "custom": a stored or shared set without provenance is one the user (or
 * the app's defaults) authored, so it is never auto-refilled later.
 */
function parseSetOrigin(raw: unknown): SetOrigin {
  if (!isRecord(raw) || typeof raw.kind !== "string") {
    return { kind: "custom" };
  }
  if (raw.kind === "custom" || raw.kind === "assumed") {
    return { kind: raw.kind };
  }
  if (raw.kind === "common") {
    const index = intInRange(raw.index, 1, MAX_COMMON_SETS, 1);
    const usage = raw.speciesUsage;
    return {
      kind: "common",
      index,
      speciesUsage:
        typeof usage === "number" && Number.isFinite(usage) && usage >= 0
          ? Math.min(1, usage)
          : null,
    };
  }
  return { kind: "custom" };
}

function parseSelection(raw: unknown, fallback: MoveSelection): MoveSelection {
  if (!isRecord(raw)) return fallback;
  const side = oneOf(raw.side, SIDE_IDS);
  const slot = raw.slot;
  if (!side || typeof slot !== "number" || !MOVE_SLOTS.some((s) => s === slot))
    return fallback;
  return { side, slot };
}

/** A complete, valid state from unknown data; bad parts become defaults. */
export function parseCalcState(raw: unknown): CalcState {
  const defaults = createDefaultCalcState();
  if (!isRecord(raw)) return defaults;

  const sides = isRecord(raw.sides) ? raw.sides : {};
  const fieldSides = isRecord(raw.fieldSides) ? raw.fieldSides : {};
  const origins = isRecord(raw.origins) ? raw.origins : {};
  return {
    sides: {
      p1: parseSide(sides.p1, defaults.sides.p1),
      p2: parseSide(sides.p2, defaults.sides.p2),
    },
    origins: {
      p1: parseSetOrigin(origins.p1),
      p2: parseSetOrigin(origins.p2),
    },
    fieldSides: {
      p1: parseFieldSide(fieldSides.p1),
      p2: parseFieldSide(fieldSides.p2),
    },
    weather: oneOf(raw.weather, WEATHERS),
    terrain: oneOf(raw.terrain, TERRAINS),
    gravity: raw.gravity === true,
    trickRoom: raw.trickRoom === true,
    selected: parseSelection(raw.selected, defaults.selected),
  };
}

/** The saved state, or the default one when nothing usable is stored. */
export function loadCalcState(): CalcState {
  try {
    const stored = localStorage.getItem(CALC_STORAGE_KEY);
    if (!stored) return createDefaultCalcState();
    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION) {
      return createDefaultCalcState();
    }
    return parseCalcState(parsed.state);
  } catch {
    return createDefaultCalcState();
  }
}

export function saveCalcState(state: CalcState): void {
  try {
    localStorage.setItem(
      CALC_STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, state }),
    );
  } catch {
    // Storage can be full or unavailable; the calculator still works without it.
  }
}
