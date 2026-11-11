import { Dex, gen, toID } from "@/data/gen";
import type { StatsTable, TypeName } from "@/types/pokemon";

export interface MegaOption {
  /** The Mega Stone that triggers the evolution, e.g. "Garchompite". */
  stone: string;
  /** The resulting forme, e.g. "Garchomp-Mega". */
  forme: string;
}

export interface SpeciesInfo {
  /** Display name and lookup key, e.g. "Garchomp", "Rotom-Wash". */
  name: string;
  id: string;
  dexNumber: number;
  types: TypeName[];
  baseStats: StatsTable;
  /** Abilities this forme can have, most common first. */
  abilities: string[];
  weightKg: number;
  /** The species this forme belongs to, e.g. "Garchomp" for "Garchomp-Mega". */
  baseSpecies: string;
  isMega: boolean;
  /**
   * True for formes that only exist mid-battle (Megas, Aegislash-Blade...).
   * They can be picked in the calc but not put on a team.
   */
  isBattleOnly: boolean;
  /** For a Mega: the stone it needs. Otherwise null. */
  megaStone: string | null;
  /** For a base forme: the Mega Evolutions it has. */
  megas: MegaOption[];
}

/** Entries the calc library uses internally that are not real picks. */
const HIDDEN = new Set(["Aegislash-Both"]);

let cache: { list: SpeciesInfo[]; byId: Map<string, SpeciesInfo> } | undefined;

function build() {
  const abilityNames = new Set<string>();
  for (const ability of gen.abilities) abilityNames.add(ability.name);

  const megasByBase = new Map<string, MegaOption[]>();
  const stoneByMega = new Map<string, string>();
  for (const item of gen.items) {
    if (!item.megaStone) continue;
    for (const [base, forme] of Object.entries(item.megaStone)) {
      const options = megasByBase.get(base) ?? [];
      options.push({ stone: item.name, forme });
      megasByBase.set(base, options);
      stoneByMega.set(forme, item.name);
    }
  }

  const list: SpeciesInfo[] = [];
  for (const specie of gen.species) {
    if (HIDDEN.has(specie.name)) continue;
    const dex = Dex.species.get(specie.name);

    const abilities = dex.exists
      ? Object.values(dex.abilities).filter((name) => abilityNames.has(name))
      : [];
    const fallback = specie.abilities?.[0];
    if (abilities.length === 0 && fallback) abilities.push(fallback);

    const megaStone = stoneByMega.get(specie.name) ?? null;
    const isMega = megaStone !== null || /-Mega(-|$)/.test(specie.name);

    list.push({
      name: specie.name,
      id: specie.id,
      dexNumber: dex.exists ? dex.num : 0,
      types: specie.types.filter((type) => type !== "???") as TypeName[],
      baseStats: { ...specie.baseStats },
      abilities: [...new Set(abilities)],
      weightKg: specie.weightkg,
      baseSpecies: dex.exists
        ? dex.baseSpecies
        : (specie.baseSpecies ?? specie.name),
      isMega,
      isBattleOnly: isMega || (dex.exists && Boolean(dex.battleOnly)),
      megaStone,
      megas: megasByBase.get(specie.name) ?? [],
    });
  }
  list.sort((a, b) => a.name.localeCompare(b.name));

  const byId = new Map(list.map((info) => [info.id, info]));
  return { list, byId };
}

function data() {
  cache ??= build();
  return cache;
}

export interface ListSpeciesOptions {
  /** Include Megas and other in-battle formes. Default false. */
  includeBattleOnly?: boolean;
}

/** The Champions roster, sorted by name. */
export function listSpecies(
  options: ListSpeciesOptions = {},
): readonly SpeciesInfo[] {
  const { list } = data();
  return options.includeBattleOnly
    ? list
    : list.filter((info) => !info.isBattleOnly);
}

/** Looks a species up by name or id, case-insensitively. */
export function getSpecies(name: string): SpeciesInfo | undefined {
  return data().byId.get(toID(name));
}

/**
 * The forme a species takes in battle while holding an item: the Mega forme
 * when the item is its Mega Stone, otherwise the species itself.
 */
export function resolveBattleForme(
  species: string,
  item: string | null,
): string {
  const info = getSpecies(species);
  if (!info || !item) return species;
  return info.megas.find((mega) => mega.stone === item)?.forme ?? species;
}
