// Resolves Smogon chaos IDs to display names using @smogon/calc's
// generation 0 (Pokémon Champions). The ingest script runs under plain
// Node, so this module keeps its own types (see ./types.ts) and never
// imports from src/.

import { Generations, toID } from "@smogon/calc";

import type { NameResolver } from "./types.ts";

// Smogon writes ASCII apostrophes; calc (and therefore @/data) uses the
// typographic apostrophe. Normalize so every name matches @/data exactly.
const SPECIES_ALIASES: Record<string, string> = {
  "Farfetch'd": "Farfetch\u2019d",
  "Sirfetch'd": "Sirfetch\u2019d",
};

// The stats list "Aegislash" (the team-sheet name); calc only knows
// Aegislash-Shield/Blade/Both. The output keeps "Aegislash" unchanged —
// the metagame page resolves it separately.

// The chaos files use the id "nothing" for empty item slots; calc has no
// such item. Empty move slots come through as "".
const NO_ITEM = "Nothing";
const NO_MOVE = "(No Move)";

function idMap(
  entries: Iterable<{ id: string; name: string }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) map.set(entry.id, entry.name);
  return map;
}

export function createCalcNameResolver(): NameResolver {
  const gen = Generations.get(0);
  const abilities = idMap(gen.abilities);
  const items = idMap(gen.items);
  const moves = idMap(gen.moves);

  const lookup = (
    map: Map<string, string>,
    id: string,
    kind: string,
  ): string => {
    const name = map.get(toID(id));
    if (name) return name;
    console.warn(`Unknown ${kind} id in chaos data: ${JSON.stringify(id)}`);
    return id;
  };

  return {
    ability: (id) => lookup(abilities, id, "ability"),
    item: (id) =>
      toID(id) === "nothing" ? NO_ITEM : lookup(items, id, "item"),
    move: (id) => (id === "" ? NO_MOVE : lookup(moves, id, "move")),
    species: (name) => SPECIES_ALIASES[name] ?? name,
  };
}
