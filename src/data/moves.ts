import { Dex, gen, toID } from "@/data/gen";
import type { MoveCategory, TypeName } from "@/types/pokemon";

export interface MoveInfo {
  name: string;
  id: string;
  type: TypeName;
  category: MoveCategory;
  /** 0 for status moves and moves with variable power. */
  basePower: number;
  /** Percentage, or null when the move never misses. */
  accuracy: number | null;
  pp: number;
  priority: number;
  /** True when the move hits more than one target in doubles. */
  isSpread: boolean;
  /** Fixed hit count, or the [min, max] range, for multi-hit moves. */
  multihit: number | [number, number] | null;
  shortDesc: string;
}

const NO_MOVE = "(No Move)";
const SPREAD_TARGETS = new Set(["allAdjacent", "allAdjacentFoes"]);

let cache: { list: MoveInfo[]; byId: Map<string, MoveInfo> } | undefined;

function build() {
  const list: MoveInfo[] = [];
  for (const move of gen.moves) {
    if (move.name === NO_MOVE) continue;
    const dex = Dex.moves.get(move.name);
    const multihit = move.multihit;
    list.push({
      name: move.name,
      id: move.id,
      type: move.type as TypeName,
      category: move.category ?? "Status",
      basePower: move.basePower,
      accuracy:
        dex.exists && typeof dex.accuracy === "number" ? dex.accuracy : null,
      pp: dex.exists ? dex.pp : 0,
      priority: move.priority ?? 0,
      isSpread: SPREAD_TARGETS.has(move.target ?? ""),
      multihit:
        multihit === undefined
          ? null
          : typeof multihit === "number"
            ? multihit
            : [multihit[0] ?? 1, multihit[1] ?? multihit[0] ?? 1],
      shortDesc: dex.exists ? dex.shortDesc : "",
    });
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  return { list, byId: new Map(list.map((info) => [info.id, info])) };
}

function data() {
  cache ??= build();
  return cache;
}

/** Every move available in Champions, sorted by name. */
export function listMoves(): readonly MoveInfo[] {
  return data().list;
}

/** Looks a move up by name or id, case-insensitively. */
export function getMove(name: string): MoveInfo | undefined {
  return data().byId.get(toID(name));
}

const learnsetCache = new Map<string, Promise<string[]>>();

async function loadLearnableMoves(species: string): Promise<string[]> {
  const { byId } = data();
  const learnable = new Set<string>();

  let current = Dex.species.get(species);
  // In-battle formes (Megas...) learn what the forme they change from learns.
  if (current.exists && current.battleOnly) {
    const from = Array.isArray(current.battleOnly)
      ? current.battleOnly[0]
      : current.battleOnly;
    if (from) current = Dex.species.get(from);
  }

  // Walk down the evolution line: a learnset omits moves only a pre-evolution gets.
  const seen = new Set<string>();
  while (current.exists && !seen.has(current.id)) {
    seen.add(current.id);
    let entry = await Dex.learnsets.get(current.id);
    if (!entry?.learnset && current.baseSpecies !== current.name) {
      entry = await Dex.learnsets.get(toID(current.baseSpecies));
    }
    for (const moveId of Object.keys(entry?.learnset ?? {})) {
      const move = byId.get(moveId);
      if (move) learnable.add(move.name);
    }
    if (!current.prevo) break;
    current = Dex.species.get(current.prevo);
  }

  return [...learnable].sort((a, b) => a.localeCompare(b));
}

/**
 * Champions moves a species can learn, sorted by name. Derived from the
 * mainline learnsets (all generations) limited to moves that exist in
 * Champions, so treat it as "very likely legal", not as an official list.
 */
export function getLearnableMoves(species: string): Promise<string[]> {
  const key = toID(species);
  let pending = learnsetCache.get(key);
  if (!pending) {
    pending = loadLearnableMoves(species);
    learnsetCache.set(key, pending);
  }
  return pending;
}
