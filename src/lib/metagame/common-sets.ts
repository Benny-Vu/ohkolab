import type { StatsTable } from "@/types/pokemon";
import type { PokemonUsage } from "@/lib/metagame/types";

/**
 * One ready-to-fill set derived from usage data: the most common item,
 * ability, nature and Stat Point spread, with the four most common
 * moves. Names come straight from the usage snapshot, so callers that
 * feed these into the calculator must still validate them against the
 * roster (the data layer owns that).
 */
export interface CommonSet {
  /** Which most-common set this is: 1 = the most common. */
  index: number;
  item: string | null;
  ability: string | null;
  nature: string | null;
  statPoints: StatsTable;
  moves: [string | null, string | null, string | null, string | null];
  /** The species' share of teams (0-1), straight from the snapshot. */
  speciesUsage: number | null;
  /**
   * True when the spread was defaulted: the snapshot had no spread for
   * the species, so the set carries an empty Stat Point spread and no
   * nature. Show it as "assumed", never as a real common set.
   */
  assumed: boolean;
}

/** Placeholder names the chaos files use for "everything else". */
const NON_NAMES = new Set(["Other", "Nothing"]);

function isRealName(name: string | undefined): name is string {
  return name !== undefined && name !== "" && !NON_NAMES.has(name);
}

/** The names worth using, placeholders stripped, most common first. */
function realNames(shares: { name: string; share: number }[]): string[] {
  return shares
    .filter((share) => isRealName(share.name))
    .map((share) => share.name);
}

/** The ith name of a list, falling back to the first, then to null. */
function pickName(names: string[], index: number): string | null {
  return names[index] ?? names[0] ?? null;
}

/** The four most common moves, padded into the set's move slots. */
function moveSlots(moveNames: string[]): CommonSet["moves"] {
  return [
    moveNames[0] ?? null,
    moveNames[1] ?? null,
    moveNames[2] ?? null,
    moveNames[3] ?? null,
  ];
}

/**
 * A species' top N common sets from one usage snapshot entry, most
 * common first. Set 1 combines the top spread, item, ability and moves;
 * sets 2 and 3 vary the spread, item and ability (the snapshot only
 * keeps per-field shares, so the move slots stay the species' top four).
 * A species with no spread data yields one set labelled `assumed` with an
 * empty spread. A species missing from the snapshot yields nothing.
 */
export function topCommonSets(
  entry: PokemonUsage | null,
  count = 3,
): CommonSet[] {
  if (entry === null || count <= 0) {
    return [];
  }
  const items = realNames(entry.items);
  const abilities = realNames(entry.abilities);
  const moves = realNames(entry.moves);
  const setCount = Math.min(count, Math.max(1, entry.spreads.length));
  const sets: CommonSet[] = [];
  for (let i = 0; i < setCount; i += 1) {
    const spread = entry.spreads[i];
    sets.push({
      index: i + 1,
      item: pickName(items, i),
      ability: pickName(abilities, i),
      nature: spread?.nature ?? null,
      statPoints: spread?.statPoints ?? {
        hp: 0,
        atk: 0,
        def: 0,
        spa: 0,
        spd: 0,
        spe: 0,
      },
      moves: moveSlots(moves),
      speciesUsage: entry.usage,
      assumed: spread === undefined,
    });
  }
  return sets;
}
