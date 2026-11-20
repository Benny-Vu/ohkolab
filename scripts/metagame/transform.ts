// Pure functions that turn Smogon chaos files into trimmed snapshots.
// Everything here is deterministic and side-effect free, so the fixture
// tests in this directory cover it without network access or calc.

import {
  LIST_LIMITS,
  POKEMON_LIMIT,
  RATING_CUTOFF,
  REGULATION,
} from "./config.ts";
import { formatPeriodLabel } from "./period.ts";
import type {
  BattleFormat,
  ChaosEntry,
  ChaosFile,
  MetagameIndex,
  MetagameIndexEntry,
  MetagameSnapshot,
  NameResolver,
  PokemonUsage,
  Share,
  SpreadShare,
  StatsTable,
} from "./types.ts";

// Spread keys look like "Adamant:2/32/0/0/0/32" (HP/Atk/Def/SpA/SpD/Spe).
const SPREAD_PATTERN = /^([^:]+):(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)$/;

export interface ParsedSpread {
  nature: string;
  statPoints: StatsTable;
}

export function parseSpreadKey(key: string): ParsedSpread | null {
  const match = SPREAD_PATTERN.exec(key);
  if (!match) return null;
  return {
    nature: match[1],
    statPoints: {
      hp: Number(match[2]),
      atk: Number(match[3]),
      def: Number(match[4]),
      spa: Number(match[5]),
      spd: Number(match[6]),
      spe: Number(match[7]),
    },
  };
}

/** Shares are rounded to four decimals and clamped to 1; usage keeps source
 * precision. Chaos counts can exceed the abilities total (Ditto's moves),
 * so shares above 1 are clamped rather than emitted. */
function roundShare(value: number): number {
  return Math.min(1, Math.round(value * 10000) / 10000);
}

/** The chaos "no move" ("" id) and "no item" ("nothing" id) buckets are not
 * real choices; drop them by exact id before ranking so list limits keep
 * real entries. */
function dropIds(
  counts: Record<string, number>,
  ids: readonly string[],
): Record<string, number> {
  const kept: Record<string, number> = {};
  for (const [id, count] of Object.entries(counts)) {
    if (!ids.includes(id)) kept[id] = count;
  }
  return kept;
}

/** The Pokémon's total weight: the sum of its Abilities values. */
export function totalWeight(entry: ChaosEntry): number {
  let total = 0;
  for (const count of Object.values(entry.Abilities ?? {})) total += count;
  return total;
}

export function toShares(
  counts: Record<string, number>,
  total: number,
  limit: number,
  resolve: (id: string) => string,
): Share[] {
  if (total <= 0) return [];
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id, count]) => ({
      name: resolve(id),
      share: roundShare(count / total),
    }));
}

/** Sums the spreads by nature before ranking; the file has no nature list. */
export function natureShares(
  spreads: Record<string, number>,
  total: number,
  limit: number,
): Share[] {
  if (total <= 0) return [];
  const byNature = new Map<string, number>();
  for (const [key, count] of Object.entries(spreads)) {
    const parsed = parseSpreadKey(key);
    if (!parsed) continue;
    byNature.set(parsed.nature, (byNature.get(parsed.nature) ?? 0) + count);
  }
  return [...byNature.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([nature, count]) => ({
      name: nature,
      share: roundShare(count / total),
    }));
}

export function spreadShares(
  spreads: Record<string, number>,
  total: number,
  limit: number,
): SpreadShare[] {
  if (total <= 0) return [];
  return Object.entries(spreads)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .flatMap(([key, count]): SpreadShare[] => {
      const parsed = parseSpreadKey(key);
      if (!parsed) return [];
      return [
        {
          nature: parsed.nature,
          statPoints: parsed.statPoints,
          share: roundShare(count / total),
        },
      ];
    });
}

function buildPokemonUsage(
  species: string,
  entry: ChaosEntry,
  rank: number,
  names: NameResolver,
): PokemonUsage {
  const total = totalWeight(entry);
  return {
    species: names.species(species),
    rank,
    usage: entry.usage ?? null,
    abilities: toShares(
      entry.Abilities ?? {},
      total,
      LIST_LIMITS.abilities,
      names.ability,
    ),
    items: toShares(
      dropIds(entry.Items ?? {}, ["nothing"]),
      total,
      LIST_LIMITS.items,
      names.item,
    ),
    moves: toShares(
      dropIds(entry.Moves ?? {}, [""]),
      total,
      LIST_LIMITS.moves,
      names.move,
    ),
    natures: natureShares(entry.Spreads ?? {}, total, LIST_LIMITS.natures),
    spreads: spreadShares(entry.Spreads ?? {}, total, LIST_LIMITS.spreads),
    teammates: toShares(
      entry.Teammates ?? {},
      total,
      LIST_LIMITS.teammates,
      names.species,
    ),
  };
}

export function buildSnapshot(
  format: BattleFormat,
  period: string,
  chaos: ChaosFile,
  names: NameResolver,
  generatedAt: string,
  url: string,
): MetagameSnapshot {
  // The chaos keys are already sorted by usage, but do not rely on it.
  const ranked = Object.entries(chaos.data)
    .sort(([, a], [, b]) => (b.usage ?? 0) - (a.usage ?? 0))
    .slice(0, POKEMON_LIMIT);

  return {
    format,
    regulation: REGULATION,
    period,
    battles: chaos.info["number of battles"],
    generatedAt,
    source: {
      id: "showdown-ladder",
      label: `Pok\u00e9mon Showdown ladder, ${formatPeriodLabel(period)}, rating ${RATING_CUTOFF}+, via smogon.com/stats`,
      url,
      formatId: chaos.info.metagame,
      ratingCutoff: RATING_CUTOFF,
    },
    pokemon: ranked.map(([species, entry], index) =>
      buildPokemonUsage(species, entry, index + 1, names),
    ),
  };
}

export function snapshotPath(period: string, format: BattleFormat): string {
  return `/data/metagame/${period}/${format}.json`;
}

/** True when both formats are already in the index for this period. */
export function isIngested(
  index: MetagameIndex | null,
  period: string,
): boolean {
  if (!index) return false;
  const formats = new Set(
    index.snapshots
      .filter((entry) => entry.period === period)
      .map((entry) => entry.format),
  );
  return formats.has("singles") && formats.has("doubles");
}

export function mergeIndex(
  existing: MetagameIndex | null,
  snapshots: MetagameSnapshot[],
): MetagameIndex {
  const entries = new Map<string, MetagameIndexEntry>();
  if (existing) {
    for (const entry of existing.snapshots) {
      entries.set(`${entry.format}:${entry.period}`, entry);
    }
  }
  for (const snapshot of snapshots) {
    entries.set(`${snapshot.format}:${snapshot.period}`, {
      format: snapshot.format,
      period: snapshot.period,
      regulation: snapshot.regulation,
      path: snapshotPath(snapshot.period, snapshot.format),
    });
  }
  const sorted = [...entries.values()].sort(
    (a, b) =>
      a.period.localeCompare(b.period) || a.format.localeCompare(b.format),
  );
  // Sorted by period, so the last assignment per format is the newest.
  const latest: Record<BattleFormat, string> = { singles: "", doubles: "" };
  for (const entry of sorted) latest[entry.format] = entry.path;
  return { latest, snapshots: sorted };
}
