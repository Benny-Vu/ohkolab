/** Shared Pokémon contracts. No imports from the Pokémon libraries here. */

export const STAT_IDS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
export type StatId = (typeof STAT_IDS)[number];
export type StatsTable = Record<StatId, number>;

export const STAT_LABELS: Record<StatId, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

export const TYPE_NAMES = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
] as const;
export type TypeName = (typeof TYPE_NAMES)[number];

export type MoveCategory = "Physical" | "Special" | "Status";
export type Gender = "M" | "F" | "N";

/**
 * One Pokémon as a player builds it. This is the shape the editor edits, the
 * team builder stores and the calc reads. Names are display names exactly as
 * the data layer lists them (e.g. "Garchomp", "Life Orb").
 */
export interface PokemonSet {
  species: string;
  nickname?: string;
  item: string | null;
  ability: string | null;
  nature: string;
  /** Champions Stat Points per stat. Limits are in `@/data` (per stat and total). */
  statPoints: StatsTable;
  /** Always four slots; an empty slot is null. */
  moves: [string | null, string | null, string | null, string | null];
  gender?: Gender;
}

export function emptyStatsTable(value = 0): StatsTable {
  return {
    hp: value,
    atk: value,
    def: value,
    spa: value,
    spd: value,
    spe: value,
  };
}
