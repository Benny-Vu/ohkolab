import { getSpecies, listSpecies } from "@/data";
import type { SpeciesInfo } from "@/data";

function sameName(a: string, b: string): boolean {
  const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return key(a) === key(b);
}

/**
 * The roster entry a usage name stands for: the species or forme itself, or,
 * for a base name the roster only has formes of ("Aegislash" for
 * "Aegislash-Shield"), its first team-legal forme. Mirrors how the Showdown
 * importer resolves pasted names.
 */
export function resolveUsageSpecies(name: string): SpeciesInfo | undefined {
  const exact = getSpecies(name);
  if (exact) return exact;
  return listSpecies().find((info) => sameName(info.baseSpecies, name));
}
