// Resolves Limitless team-sheet names against the Pokémon data, mirroring
// src/data (species.ts, natures.ts) field for field: @smogon/calc models
// Champions as generation 0, @pkmn/dex supplies the battleOnly flags. The
// script runs under plain Node, so it never imports from src/ — it repeats
// the app's logic instead of guessing at it.

import { Dex } from "@pkmn/dex";
import { Generations, toID } from "@smogon/calc";

import type {
  LimitlessSheetMember,
  ResolvedMember,
  ResolveFailure,
  SheetResolver,
} from "./types.ts";

// The least these library entries need from the resolver.
interface GenSpecies {
  id: string;
  name: string;
  baseSpecies?: string;
}
interface GenItem {
  id: string;
  name: string;
  megaStone?: { [forme: string]: string };
}
interface GenEntry {
  id: string;
  name: string;
}

// Entries the app hides from every list (src/data/species.ts).
const HIDDEN_SPECIES = new Set(["Aegislash-Both"]);

function sameName(a: string, b: string): boolean {
  const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return key(a) === key(b);
}

export function createSheetResolver(): SheetResolver {
  const gen = Generations.get(0);

  const species = [...gen.species] as unknown as GenSpecies[];
  const items = [...gen.items] as unknown as GenItem[];
  const abilities = [...gen.abilities] as unknown as GenEntry[];
  const moves = [...gen.moves] as unknown as GenEntry[];
  const natures = [...gen.natures] as unknown as GenEntry[];

  // gen.types includes the "???" placeholder; the contract's tera is one of
  // the real type names (TYPE_NAMES in src/types/pokemon.ts).
  const types = new Set(
    ([...gen.types] as unknown as GenEntry[])
      .map((type) => type.name)
      .filter((name) => name !== "???"),
  );

  const speciesById = new Map(species.map((s) => [s.id, s]));
  const itemByName = new Map(items.map((i) => [toID(i.name), i]));
  const abilityByName = new Map(abilities.map((a) => [toID(a.name), a]));
  const moveByName = new Map(moves.map((m) => [toID(m.name), m]));

  // A Mega Stone's megaStone record maps the base species (or battle forme,
  // for Floettite) to the Mega forme; the app keys Mega formes this way.
  const stoneByMegaForme = new Map<string, string>();
  for (const item of items) {
    if (!item.megaStone) continue;
    for (const forme of Object.values(item.megaStone)) {
      stoneByMegaForme.set(forme, item.name);
    }
  }

  // Mirrors src/data/species.ts: the dex entry's baseSpecies and battleOnly
  // flag decide folding, with the calc entry as fallback.
  const dexInfo = (name: string) => Dex.species.get(name);
  const isMega = (specie: GenSpecies) =>
    stoneByMegaForme.has(specie.name) || /-Mega(-|$)/.test(specie.name);
  const isBattleOnly = (specie: GenSpecies) => {
    const dex = dexInfo(specie.name);
    return isMega(specie) || (dex.exists && Boolean(dex.battleOnly));
  };
  const baseSpeciesOf = (specie: GenSpecies): string | null => {
    const dex = dexInfo(specie.name);
    if (dex.exists) return dex.baseSpecies;
    return specie.baseSpecies ?? null;
  };

  // A sheet may name a base species the roster only has formes of
  // ("Aegislash"); the app's resolveUsageSpecies picks its first team-legal
  // forme, so the ingest must agree (src/lib/metagame/species.ts).
  const teamLegal = species.filter(
    (s) => !HIDDEN_SPECIES.has(s.name) && !isBattleOnly(s),
  );
  type SpeciesResult =
    | {
        kind: "ok";
        specie: GenSpecies;
        foldedTo: string | null;
        stone: string | null;
      }
    | { kind: "unknown" }
    | { kind: "battle-only" };
  const resolveSpecies = (input: string): SpeciesResult => {
    const exact =
      speciesById.get(toID(input)) ??
      teamLegal.find((s) => sameName(s.name, input));
    if (exact) {
      if (!isBattleOnly(exact)) {
        return { kind: "ok", specie: exact, foldedTo: null, stone: null };
      }
      // Battle-only formes are not team members. A Mega folds to its base
      // species holding the stone; anything else cannot be represented.
      const stone = stoneByMegaForme.get(exact.name) ?? null;
      const base = baseSpeciesOf(exact);
      if (stone && base) {
        return { kind: "ok", specie: exact, foldedTo: base, stone };
      }
      return { kind: "battle-only" };
    }
    const byBase = teamLegal.find((s) =>
      sameName(baseSpeciesOf(s) ?? "", input),
    );
    if (byBase)
      return { kind: "ok", specie: byBase, foldedTo: null, stone: null };
    return { kind: "unknown" };
  };

  return {
    resolve(member: LimitlessSheetMember): ResolvedMember | ResolveFailure {
      const resolved = resolveSpecies(member.id || member.name);
      if (resolved.kind === "unknown") {
        return { field: "species", value: `${member.id} (${member.name})` };
      }
      if (resolved.kind === "battle-only") {
        return { field: "battle-only", value: `${member.id} (${member.name})` };
      }

      let item: string | null = null;
      if (resolved.stone) {
        // A battle-only Mega forme: the app stores the base species holding
        // its stone, whatever else the sheet said.
        item = resolved.stone;
      } else {
        const published = member.item;
        if (published !== null && published !== undefined && published !== "") {
          const found = itemByName.get(toID(published));
          if (!found) return { field: "item", value: published };
          item = found.name;
        }
      }

      const ability = abilityByName.get(toID(member.ability ?? ""));
      if (!ability) return { field: "ability", value: member.ability ?? "" };

      const nature = natures.find((n) => toID(n.name) === toID(member.nature));
      if (!nature) return { field: "nature", value: member.nature ?? "" };

      let tera: string | null = null;
      if (
        member.tera !== null &&
        member.tera !== undefined &&
        member.tera !== ""
      ) {
        if (!types.has(member.tera)) {
          return { field: "tera", value: member.tera };
        }
        tera = member.tera;
      }

      const movesOut: string[] = [];
      for (const attack of member.attacks ?? []) {
        if (attack === null || attack === undefined || attack === "") continue;
        const found = moveByName.get(toID(attack));
        if (!found) return { field: "moves", value: attack };
        movesOut.push(found.name);
      }
      if (movesOut.length === 0)
        return { field: "no-moves", value: member.name };

      return {
        species: resolved.foldedTo ?? resolved.specie.name,
        item,
        ability: ability.name,
        nature: nature.name,
        tera,
        moves: movesOut,
      };
    },
  };
}
