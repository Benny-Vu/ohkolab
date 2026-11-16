// The current regulation. Update this block every season: the Smogon format
// IDs change with each regulation (e.g. ...regmc -> ...regmd), and two
// regulations can share a month, so the IDs live here rather than in the
// script. The ingest script and the GitHub workflow both read this file.

import type { BattleFormat } from "./types.ts";

/** Regulation label stored in the snapshots, e.g. "M-C". */
export const REGULATION = "M-C";

/** Smogon format IDs for the current regulation. */
export const FORMAT_IDS: Record<BattleFormat, string> = {
  singles: "gen9championsbssregmc",
  doubles: "gen9championsvgc2026regmc",
};

/** Rating cutoff of the chaos files to download. */
export const RATING_CUTOFF = 1630;

/** Base URL of the Smogon stats archive. */
export const SMOGON_STATS_URL = "https://www.smogon.com/stats";

/** Trimming: how many Pokémon and how many entries per list to keep. */
export const POKEMON_LIMIT = 150;
export const LIST_LIMITS = {
  abilities: 10,
  items: 10,
  moves: 12,
  natures: 10,
  spreads: 10,
  teammates: 10,
} as const;
