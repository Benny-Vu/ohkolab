import { Dex } from "@pkmn/dex";
import { Generations } from "@smogon/calc";

// `@smogon/calc` builds its Champions move table from Scarlet/Violet delta
// entries, so moves unchanged since their debut keep only their Champions
// patch fields and miss type/category/basePower/etc. Fill those gaps from
// `@pkmn/dex` without ever overwriting data the library set deliberately
// (Freeze-Dry's deleted secondary, Champions-specific base powers and flags).

const NO_MOVE = "(No Move)";
const FLAG_KEYS = [
  "contact",
  "bite",
  "bullet",
  "punch",
  "sound",
  "pulse",
  "slicing",
  "wind",
] as const;

type MutableMove = {
  id: string;
  type?: string;
  category?: string;
  basePower?: number;
  priority?: number;
  target?: string;
  multihit?: number | number[];
  secondaries?: unknown;
  flags: { [key: string]: 1 | 0 | undefined };
};

export function applyMovePatches(
  gen: ReturnType<(typeof Generations)["get"]>,
): void {
  for (const move of gen.moves) {
    if (move.name === NO_MOVE) continue;
    const dex = Dex.moves.get(move.name);
    if (!dex.exists) continue;
    const m = move as unknown as MutableMove;
    if (m.type === undefined) m.type = dex.type;
    if (m.category === undefined) m.category = dex.category;
    if (m.basePower === undefined) m.basePower = dex.basePower;
    if (m.priority === undefined) m.priority = dex.priority ?? 0;
    if (m.target === undefined) m.target = dex.target;
    if (m.multihit === undefined && dex.multihit !== undefined) {
      m.multihit = dex.multihit;
    }
    if (
      m.secondaries === undefined &&
      m.id !== "freezedry" &&
      (dex.secondary || dex.secondaries?.length)
    ) {
      m.secondaries = true;
    }
    for (const key of FLAG_KEYS) {
      if (dex.flags[key] && !m.flags[key]) m.flags[key] = 1;
    }
  }
}
