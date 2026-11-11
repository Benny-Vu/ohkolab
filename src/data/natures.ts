import { gen, toID } from "@/data/gen";
import type { StatId } from "@/types/pokemon";

export interface NatureInfo {
  name: string;
  /** Stat raised by 10%, or null for a neutral nature. */
  plus: StatId | null;
  /** Stat lowered by 10%, or null for a neutral nature. */
  minus: StatId | null;
}

export const DEFAULT_NATURE = "Hardy";

let cache: NatureInfo[] | undefined;

/** All 25 natures, sorted by name. */
export function listNatures(): readonly NatureInfo[] {
  if (!cache) {
    cache = [];
    for (const nature of gen.natures) {
      const neutral = !nature.plus || nature.plus === nature.minus;
      cache.push({
        name: nature.name,
        plus: neutral ? null : (nature.plus ?? null),
        minus: neutral ? null : (nature.minus ?? null),
      });
    }
    cache.sort((a, b) => a.name.localeCompare(b.name));
  }
  return cache;
}

/** Looks a nature up by name, case-insensitively. */
export function getNature(name: string): NatureInfo | undefined {
  const id = toID(name);
  return listNatures().find((nature) => toID(nature.name) === id);
}
