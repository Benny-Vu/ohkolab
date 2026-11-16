import type { PokemonSet, StatId } from "@/types/pokemon";

export type BattleFormat = "singles" | "doubles";

export const STATUS_NAMES = ["slp", "psn", "brn", "frz", "par", "tox"] as const;
export type StatusName = (typeof STATUS_NAMES)[number];

export const WEATHERS = ["Sun", "Rain", "Sand", "Snow"] as const;
export type Weather = (typeof WEATHERS)[number];

export const TERRAINS = ["Electric", "Grassy", "Psychic", "Misty"] as const;
export type Terrain = (typeof TERRAINS)[number];

export type BoostStatId = Exclude<StatId, "hp">;
export type BoostTable = Record<BoostStatId, number>;

/** A Pokémon set plus the battle state the calc needs on top of it. */
export interface BattlerState {
  set: PokemonSet;
  /** Stat stages, -6 to +6. */
  boosts: BoostTable;
  status: StatusName | null;
  /** Current HP as a percentage of max HP, 1 to 100. */
  hpPercent: number;
}

export interface SideState {
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  tailwind: boolean;
  helpingHand: boolean;
  friendGuard: boolean;
  stealthRock: boolean;
  /** Layers of Spikes, 0 to 3. */
  spikes: number;
}

export interface FieldState {
  format: BattleFormat;
  weather: Weather | null;
  terrain: Terrain | null;
  gravity: boolean;
  attackerSide: SideState;
  defenderSide: SideState;
}

export interface MoveOptions {
  crit?: boolean;
  /** Number of hits for multi-hit moves; the library default is used when omitted. */
  hits?: number;
}

export interface DamageResult {
  move: string;
  /** Lowest and highest damage of the possible rolls. */
  min: number;
  max: number;
  /** The same range as a percentage of the defender's max HP, one decimal. */
  minPercent: number;
  maxPercent: number;
  defenderMaxHp: number;
  /**
   * Every possible damage roll, lowest first. Null when the move's hits roll
   * independently (some multi-hit moves), where only min and max are known.
   */
  rolls: number[] | null;
  /** Full one-line description, e.g. "32 Atk Garchomp Earthquake vs. ...". */
  description: string;
  /** KO summary, e.g. "37.5% chance to OHKO". Empty when the move does no damage. */
  koText: string;
}

/**
 * Router state another page can pass when navigating to `/calc` to preload a
 * side, e.g. `navigate("/calc", { state: { attacker: set } })`.
 */
export interface CalcHandoff {
  attacker?: PokemonSet;
  defender?: PokemonSet;
}

export function emptyBoosts(): BoostTable {
  return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
}

export function emptySide(): SideState {
  return {
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
    stealthRock: false,
    spikes: 0,
  };
}

export function emptyField(format: BattleFormat = "doubles"): FieldState {
  return {
    format,
    weather: null,
    terrain: null,
    gravity: false,
    attackerSide: emptySide(),
    defenderSide: emptySide(),
  };
}

export function battlerFromSet(set: PokemonSet): BattlerState {
  return { set, boosts: emptyBoosts(), status: null, hpPercent: 100 };
}
