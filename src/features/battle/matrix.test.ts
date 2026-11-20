import { describe, expect, it } from "vitest";

import type { PokemonSet } from "@/types/pokemon";
import {
  bestMoveOf,
  computeMatrix,
  matrixCellOf,
  matrixRangeText,
  type MatrixMove,
} from "@/features/battle/matrix";
import { customInput } from "@/features/battle/opponent-input";

function garchomp(): PokemonSet {
  return {
    species: "Garchomp",
    item: "Life Orb",
    ability: "Rough Skin",
    nature: "Jolly",
    statPoints: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
    moves: ["Earthquake", "Dragon Claw", null, null],
  };
}

function incineroar(): PokemonSet {
  return {
    species: "Incineroar",
    item: "Assault Vest",
    ability: "Intimidate",
    nature: "Careful",
    statPoints: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 },
    moves: ["Flare Blitz", "Knock Off", null, null],
  };
}

/** A synthetic damaging move, for the pure selection maths. */
function damage(
  move: string,
  minPercent: number,
  maxPercent: number,
): MatrixMove {
  return {
    move,
    type: null,
    kind: "damage",
    minPercent,
    maxPercent,
    ko: null,
    koText: "",
    description: "",
  };
}

function status(move: string): MatrixMove {
  return {
    move,
    type: null,
    kind: "status",
    minPercent: null,
    maxPercent: null,
    ko: null,
    koText: "",
    description: "",
  };
}

describe("bestMoveOf", () => {
  it("picks the only damaging move", () => {
    expect(
      bestMoveOf([status("Protect"), damage("Earthquake", 40, 47)])?.move,
    ).toBe("Earthquake");
  });

  it("prefers a guaranteed OHKO over a possible one", () => {
    expect(
      bestMoveOf([damage("Earthquake", 102, 118), damage("Outrage", 96, 112)])
        ?.move,
    ).toBe("Earthquake");
  });

  it("prefers a possible OHKO over any non-OHKO, even a stronger guaranteed 2HKO", () => {
    expect(
      bestMoveOf([
        damage("Rock Slide", 78, 104),
        damage("Close Combat", 92, 98),
      ])?.move,
    ).toBe("Rock Slide");
  });

  it("breaks ties on the higher guaranteed roll, then the top roll", () => {
    expect(bestMoveOf([damage("A", 50, 60), damage("B", 52, 61)])?.move).toBe(
      "B",
    );
    expect(bestMoveOf([damage("A", 50, 62), damage("B", 50, 61)])?.move).toBe(
      "A",
    );
  });

  it("returns null without a damaging move", () => {
    expect(bestMoveOf([status("Protect")])).toBeNull();
    expect(bestMoveOf([])).toBeNull();
  });
});

describe("matrixRangeText", () => {
  it("prints a range, a fixed amount and immunity", () => {
    expect(matrixRangeText(damage("X", 45.2, 53.6))).toBe("45.2 - 53.6%");
    expect(matrixRangeText(damage("X", 100, 100))).toBe("100%");
    expect(matrixRangeText({ ...damage("X", 0, 0), kind: "none" })).toBe("0%");
    expect(matrixRangeText(status("X"))).toBe("–");
  });
});

describe("computeMatrix", () => {
  it("fills both directions with a cell per pair", () => {
    const mySets = [garchomp()];
    const opponents = [customInput(incineroar())];
    const matrix = computeMatrix({ mySets, opponents, format: "doubles" });

    expect(matrix.mine).toHaveLength(1);
    expect(matrix.mine[0]).toHaveLength(1);
    expect(matrix.theirs).toHaveLength(1);
    expect(matrix.theirs[0]).toHaveLength(1);
  });

  it("calculates a real matchup with a percentage range and a KO label", () => {
    const cell = matrixCellOf(garchomp(), incineroar(), "doubles");

    expect(cell.moves).toHaveLength(2);
    const earthquake = cell.moves.find((move) => move.move === "Earthquake");
    expect(earthquake?.kind).toBe("damage");
    expect(earthquake?.minPercent ?? 0).toBeGreaterThan(0);
    expect(earthquake?.maxPercent ?? 0).toBeGreaterThanOrEqual(
      earthquake?.minPercent ?? 0,
    );
    expect(earthquake?.description).toContain("Earthquake");
    // The best move of the pair is the higher-damage one.
    expect(cell.best?.move).toBe("Earthquake");
  });

  it("skips empty move slots and never throws on them", () => {
    const bare = { ...garchomp(), moves: [null, null, null, null] as never };
    const cell = matrixCellOf(bare, incineroar(), "doubles");

    expect(cell.moves).toEqual([]);
    expect(cell.best).toBeNull();
  });

  it("marks a status move as such instead of calculating damage", () => {
    const protector = {
      ...garchomp(),
      moves: ["Protect", null, null, null] as never,
    };
    const cell = matrixCellOf(protector, incineroar(), "doubles");

    expect(cell.moves[0]?.kind).toBe("status");
    expect(cell.best).toBeNull();
  });
});
