import type { BattleFormat } from "@/types/battle";
import type { StatsTable } from "@/types/pokemon";

/** Where a metagame snapshot's numbers come from. */
export interface MetagameSource {
  id: "showdown-ladder";
  label: string;
  url: string;
  formatId: string;
  ratingCutoff: number;
}

/** One named thing's share of a list, as a fraction from 0 to 1. */
export interface Share {
  name: string;
  share: number;
}

/** A nature + Stat Point spread and how common it is. */
export interface SpreadShare {
  nature: string;
  statPoints: StatsTable;
  share: number;
}

/** Usage stats for one Pokémon in one snapshot. */
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

/** One format, one month, one JSON file. */
export interface MetagameSnapshot {
  format: BattleFormat;
  regulation: string;
  period: string;
  battles: number;
  generatedAt: string;
  source: MetagameSource;
  pokemon: PokemonUsage[];
}

/** Directory of available snapshots; `latest` values are paths. */
export interface MetagameIndex {
  latest: Partial<Record<BattleFormat, string>>;
  snapshots: {
    format: BattleFormat;
    period: string;
    regulation: string;
    path: string;
  }[];
}
