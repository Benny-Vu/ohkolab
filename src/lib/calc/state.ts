import { createDefaultSet, resolveBattleForme } from "@/data";
import {
  emptyBoosts,
  emptySide,
  type BoostStatId,
  type BoostTable,
  type SideState,
  type StatusName,
  type Terrain,
  type Weather,
} from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";

/**
 * State of the damage calculator: two Pokémon, the conditions on each one's
 * side of the field and the shared field. The battle format is not part of
 * it; it comes from the app-wide preference.
 */

export const SIDE_IDS = ["p1", "p2"] as const;
export type SideId = (typeof SIDE_IDS)[number];

export const MOVE_SLOTS = [0, 1, 2, 3] as const;
export const MIN_STAGE = -6;
export const MAX_STAGE = 6;
export const MIN_HP_PERCENT = 1;
export const MAX_HP_PERCENT = 100;
export const MAX_SPIKES = 3;

export type CritFlags = [boolean, boolean, boolean, boolean];

/** The on/off conditions of a side (everything in `SideState` but Spikes). */
export type SideFlag = Exclude<keyof SideState, "spikes">;

export interface CalcSide {
  set: PokemonSet;
  /** Stat stages, -6 to +6. */
  boosts: BoostTable;
  status: StatusName | null;
  /** Current HP as a percentage of max HP, 1 to 100. */
  hpPercent: number;
  /** Mega Evolved. Only ever true while the set holds one of its Mega Stones. */
  mega: boolean;
  /** Critical-hit toggle of each move slot. */
  crits: CritFlags;
}

export interface MoveSelection {
  /** The side whose move is selected. */
  side: SideId;
  slot: number;
}

export interface CalcState {
  sides: Record<SideId, CalcSide>;
  /** Conditions on each Pokémon's own side of the field. */
  fieldSides: Record<SideId, SideState>;
  weather: Weather | null;
  terrain: Terrain | null;
  gravity: boolean;
  /** Trick Room reverses the turn order of equal-priority moves. */
  trickRoom: boolean;
  /** The move whose full result is shown. */
  selected: MoveSelection;
}

export type CalcAction =
  | { type: "setSet"; side: SideId; set: PokemonSet }
  | { type: "setBoost"; side: SideId; stat: BoostStatId; value: number }
  | { type: "clearBoosts"; side: SideId }
  | { type: "setStatus"; side: SideId; status: StatusName | null }
  | { type: "setHpPercent"; side: SideId; value: number }
  | { type: "setMega"; side: SideId; on: boolean }
  | { type: "setCrit"; side: SideId; slot: number; on: boolean }
  | { type: "selectMove"; side: SideId; slot: number }
  | { type: "setWeather"; weather: Weather | null }
  | { type: "setTerrain"; terrain: Terrain | null }
  | { type: "setGravity"; on: boolean }
  | { type: "setTrickRoom"; on: boolean }
  | { type: "setSideFlag"; side: SideId; flag: SideFlag; on: boolean }
  | { type: "setSpikes"; side: SideId; layers: number }
  | { type: "swapSides" }
  | { type: "reset" }
  /** Puts back an earlier state, e.g. to undo a reset. */
  | { type: "restore"; state: CalcState }
  | { type: "loadSets"; sets: Partial<Record<SideId, PokemonSet>> };

export function otherSide(side: SideId): SideId {
  return side === "p1" ? "p2" : "p1";
}

/**
 * The Mega forme a set turns into with the item it holds, or null when it
 * holds no Mega Stone of its own.
 */
export function megaFormeOf(set: Pick<PokemonSet, "species" | "item">) {
  const forme = resolveBattleForme(set.species, set.item);
  return forme === set.species ? null : forme;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function isSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < MOVE_SLOTS.length;
}

/**
 * A side at full health with no battle state. It starts Mega Evolved when the
 * set holds its Mega Stone, since that is nearly always the forme of interest.
 */
export function createSide(set: PokemonSet): CalcSide {
  return {
    set,
    boosts: emptyBoosts(),
    status: null,
    hpPercent: MAX_HP_PERCENT,
    mega: megaFormeOf(set) !== null,
    crits: [false, false, false, false],
  };
}

function defaultSets(): Record<SideId, PokemonSet> {
  return {
    p1: {
      ...createDefaultSet("Garchomp"),
      ability: "Rough Skin",
      nature: "Jolly",
      statPoints: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
      moves: ["Earthquake", "Dragon Claw", "Rock Slide", "Protect"],
    },
    p2: {
      ...createDefaultSet("Incineroar"),
      item: "Sitrus Berry",
      ability: "Intimidate",
      nature: "Careful",
      statPoints: { hp: 32, atk: 2, def: 0, spa: 0, spd: 32, spe: 0 },
      moves: ["Flare Blitz", "Knock Off", "Fake Out", "Parting Shot"],
    },
  };
}

/** The state the calculator starts from and returns to on reset. */
export function createDefaultCalcState(): CalcState {
  const sets = defaultSets();
  return {
    sides: { p1: createSide(sets.p1), p2: createSide(sets.p2) },
    fieldSides: { p1: emptySide(), p2: emptySide() },
    weather: null,
    terrain: null,
    gravity: false,
    trickRoom: false,
    selected: { side: "p1", slot: 0 },
  };
}

function withSide(
  state: CalcState,
  id: SideId,
  patch: Partial<CalcSide>,
): CalcState {
  return {
    ...state,
    sides: { ...state.sides, [id]: { ...state.sides[id], ...patch } },
  };
}

function withFieldSide(
  state: CalcState,
  id: SideId,
  patch: Partial<SideState>,
): CalcState {
  return {
    ...state,
    fieldSides: {
      ...state.fieldSides,
      [id]: { ...state.fieldSides[id], ...patch },
    },
  };
}

function setSet(state: CalcState, id: SideId, set: PokemonSet): CalcState {
  const side = state.sides[id];
  // A different Pokémon starts fresh: stages, status and HP belonged to the old one.
  if (set.species !== side.set.species) {
    return withSide(state, id, createSide(set));
  }
  const couldMega = megaFormeOf(side.set) !== null;
  const canMega = megaFormeOf(set) !== null;
  // Picking up a Mega Stone switches Mega Evolution on; losing it switches it off.
  const mega = canMega ? (couldMega ? side.mega : true) : false;
  return withSide(state, id, { set, mega });
}

export function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case "setSet":
      return setSet(state, action.side, action.set);
    case "setBoost":
      return withSide(state, action.side, {
        boosts: {
          ...state.sides[action.side].boosts,
          [action.stat]: clampInt(action.value, MIN_STAGE, MAX_STAGE),
        },
      });
    case "clearBoosts":
      return withSide(state, action.side, { boosts: emptyBoosts() });
    case "setStatus":
      return withSide(state, action.side, { status: action.status });
    case "setHpPercent":
      return withSide(state, action.side, {
        hpPercent: clampInt(action.value, MIN_HP_PERCENT, MAX_HP_PERCENT),
      });
    case "setMega":
      return withSide(state, action.side, {
        mega: action.on && megaFormeOf(state.sides[action.side].set) !== null,
      });
    case "setCrit": {
      if (!isSlot(action.slot)) return state;
      const crits: CritFlags = [...state.sides[action.side].crits];
      crits[action.slot] = action.on;
      return withSide(state, action.side, { crits });
    }
    case "selectMove":
      if (!isSlot(action.slot)) return state;
      return { ...state, selected: { side: action.side, slot: action.slot } };
    case "setWeather":
      return { ...state, weather: action.weather };
    case "setTerrain":
      return { ...state, terrain: action.terrain };
    case "setGravity":
      return { ...state, gravity: action.on };
    case "setTrickRoom":
      return { ...state, trickRoom: action.on };
    case "setSideFlag":
      return withFieldSide(state, action.side, { [action.flag]: action.on });
    case "setSpikes":
      return withFieldSide(state, action.side, {
        spikes: clampInt(action.layers, 0, MAX_SPIKES),
      });
    case "swapSides":
      return {
        ...state,
        sides: { p1: state.sides.p2, p2: state.sides.p1 },
        fieldSides: { p1: state.fieldSides.p2, p2: state.fieldSides.p1 },
        selected: { ...state.selected, side: otherSide(state.selected.side) },
      };
    case "reset":
      return createDefaultCalcState();
    case "restore":
      return action.state;
    case "loadSets": {
      const sides = { ...state.sides };
      for (const id of SIDE_IDS) {
        const set = action.sets[id];
        if (set) sides[id] = createSide(set);
      }
      return { ...state, sides, selected: { side: "p1", slot: 0 } };
    }
  }
}
