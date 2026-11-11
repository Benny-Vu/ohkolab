/**
 * Internal handles on the Pokémon libraries. Nothing outside `src/data/`
 * imports this file; use the functions exported from `@/data` instead.
 */
import { Dex } from "@pkmn/dex";
import { Generations, toID } from "@smogon/calc";

/** `@smogon/calc` models Pokémon Champions as generation 0. */
export const gen = Generations.get(0);

export { Dex, toID };
