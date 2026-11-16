// Local types for the metagame data pipeline.
//
// These mirror the app-side model (src/types/ and the metagame data sources
// note) field for field, but the ingest script runs under plain Node where
// the @/ alias does not resolve, so everything here is self-contained.

export type BattleFormat = "singles" | "doubles";

export interface StatsTable {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

/** A name with the share of this Pokémon's sets that use it, 0 to 1. */
export interface Share {
  name: string;
  share: number;
}

export interface SpreadShare {
  nature: string;
  statPoints: StatsTable;
  share: number;
}

export interface PokemonUsage {
  species: string;
  rank: number;
  usage: number | null;
  abilities: Share[];
  items: Share[];
  moves: Share[];
  natures: Share[];
  spreads: SpreadShare[];
  teammates: Share[];
}

export interface MetagameSource {
  id: "showdown-ladder";
  label: string;
  url: string;
  formatId: string;
  ratingCutoff: number;
}

/** One format for one month. One JSON file. */
export interface MetagameSnapshot {
  format: BattleFormat;
  regulation: string;
  period: string;
  battles: number;
  generatedAt: string;
  source: MetagameSource;
  pokemon: PokemonUsage[];
}

export interface MetagameIndexEntry {
  format: BattleFormat;
  period: string;
  regulation: string;
  path: string;
}

/** public/data/metagame/index.json */
export interface MetagameIndex {
  latest: Record<BattleFormat, string>;
  snapshots: MetagameIndexEntry[];
}

/** Resolves Smogon chaos IDs to display names. */
export interface NameResolver {
  ability(id: string): string;
  item(id: string): string;
  move(id: string): string;
  species(name: string): string;
}

// --- Smogon chaos file shapes (only the fields the pipeline reads) ---

export interface ChaosInfo {
  metagame: string;
  cutoff: number;
  "number of battles": number;
}

export interface ChaosEntry {
  usage?: number;
  Abilities: Record<string, number>;
  Items: Record<string, number>;
  Spreads: Record<string, number>;
  Moves: Record<string, number>;
  Teammates: Record<string, number>;
}

export interface ChaosFile {
  info: ChaosInfo;
  data: Record<string, ChaosEntry>;
}
