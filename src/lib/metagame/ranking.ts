import type { PokemonUsage } from "@/lib/metagame/types";

/** Find a Pokémon by species name (case-insensitive). */
export function findPokemon(
  pokemon: PokemonUsage[],
  species: string,
): PokemonUsage | undefined {
  const needle = species.trim().toLowerCase();
  return pokemon.find((entry) => entry.species.toLowerCase() === needle);
}

/** Sort a copy by rank ascending (snapshots are already ranked; this is a guard). */
export function byRank(pokemon: PokemonUsage[]): PokemonUsage[] {
  return [...pokemon].sort((a, b) => a.rank - b.rank);
}
