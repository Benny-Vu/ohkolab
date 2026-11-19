import { describe, expect, it } from "vitest";

import { calculateDamage, createDefaultSet, getMove } from "@/data";
import { battlerFromSet, emptyField } from "@/types/battle";
import type { BattlerState, SideState } from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";

function attacker(): PokemonSet {
  return {
    ...createDefaultSet("Garchomp"),
    nature: "Jolly",
    item: "Life Orb",
    ability: "Rough Skin",
    statPoints: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
    moves: ["Earthquake", "Dragon Claw", "Protect", null],
  };
}

function incineroar(): PokemonSet {
  return {
    ...createDefaultSet("Incineroar"),
    nature: "Careful",
    statPoints: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 },
  };
}

/** A defender's side with the given flags on, everything else off. */
function side(flags: Partial<SideState>): SideState {
  return { ...emptyField("doubles").defenderSide, ...flags };
}

describe("spread moves in doubles", () => {
  it("derives the spread flag from the move's target", () => {
    // allAdjacent / allAdjacentFoes targets hit both foes in doubles.
    expect(getMove("Earthquake")?.isSpread).toBe(true);
    expect(getMove("Rock Slide")?.isSpread).toBe(true);
    expect(getMove("Astral Barrage")?.isSpread).toBe(true);
    expect(getMove("Dragon Claw")?.isSpread).toBe(false);
    expect(getMove("Flare Blitz")?.isSpread).toBe(false);
  });

  it("applies the 0.75 spread reduction in doubles", () => {
    const atk = battlerFromSet(attacker());
    const def = battlerFromSet(incineroar());
    const singles = calculateDamage(
      atk,
      def,
      "Earthquake",
      emptyField("singles"),
    );
    const doubles = calculateDamage(
      atk,
      def,
      "Earthquake",
      emptyField("doubles"),
    );

    expect(doubles.max).toBeLessThan(singles.max);
    expect(doubles.min).toBeLessThan(singles.min);
    // Integer flooring at each stage moves the ratio off exactly 0.75, but
    // never far: the library applies its native spread modifier.
    expect(Math.abs(doubles.max / singles.max - 0.75)).toBeLessThan(0.02);
    expect(Math.abs(doubles.min / singles.min - 0.75)).toBeLessThan(0.02);
  });

  it("leaves single-target moves untouched in doubles", () => {
    const atk = battlerFromSet(attacker());
    const def = battlerFromSet(incineroar());
    const singles = calculateDamage(
      atk,
      def,
      "Dragon Claw",
      emptyField("singles"),
    );
    const doubles = calculateDamage(
      atk,
      def,
      "Dragon Claw",
      emptyField("doubles"),
    );

    expect(doubles.min).toBe(singles.min);
    expect(doubles.max).toBe(singles.max);
  });
});

describe("KO chance with field modifiers", () => {
  it("turns a guaranteed OHKO into a roll behind Aurora Veil", () => {
    const atk = battlerFromSet(attacker());
    // Incineroar at 63% of 202 HP: 127 HP left, inside the veiled 121-144
    // range but below the plain 242 minimum.
    const def: BattlerState = {
      ...battlerFromSet(incineroar()),
      hpPercent: 63,
    };

    const plain = calculateDamage(
      atk,
      def,
      "Earthquake",
      emptyField("singles"),
    );
    expect(plain.koText).toMatch(/guaranteed OHKO/i);

    const veiled = calculateDamage(atk, def, "Earthquake", {
      ...emptyField("singles"),
      defenderSide: side({ auroraVeil: true }),
    });
    expect(veiled.max).toBeLessThan(plain.max);
    expect(veiled.koText).toMatch(/^\d+(?:\.\d+)?% chance to OHKO$/);
  });

  it("halves physical damage through Reflect and special damage through Light Screen", () => {
    const atk = battlerFromSet(attacker());
    const def = battlerFromSet(incineroar());

    const quake = calculateDamage(
      atk,
      def,
      "Earthquake",
      emptyField("singles"),
    );
    const reflected = calculateDamage(atk, def, "Earthquake", {
      ...emptyField("singles"),
      defenderSide: side({ reflect: true }),
    });
    expect(Math.abs(reflected.max / quake.max - 0.5)).toBeLessThan(0.02);
    expect(reflected.koText).not.toBe(quake.koText);
    // Light Screen does nothing to a physical move: the screens are
    // category-specific.
    const screened = calculateDamage(atk, def, "Earthquake", {
      ...emptyField("singles"),
      defenderSide: side({ lightScreen: true }),
    });
    expect(screened.max).toBe(quake.max);

    const draco = calculateDamage(
      atk,
      def,
      "Draco Meteor",
      emptyField("singles"),
    );
    const walled = calculateDamage(atk, def, "Draco Meteor", {
      ...emptyField("singles"),
      defenderSide: side({ lightScreen: true }),
    });
    expect(Math.abs(walled.max / draco.max - 0.5)).toBeLessThan(0.02);
    expect(walled.koText).not.toBe(draco.koText);
  });

  it("boosts the attacker by 1.5 with Helping Hand on its side", () => {
    const atk = battlerFromSet(attacker());
    const def = battlerFromSet(incineroar());
    const field = emptyField("doubles");

    const plain = calculateDamage(atk, def, "Earthquake", field);
    const helped = calculateDamage(atk, def, "Earthquake", {
      ...field,
      attackerSide: { ...field.attackerSide, helpingHand: true },
    });
    expect(Math.abs(helped.max / plain.max - 1.5)).toBeLessThan(0.02);
    expect(helped.description).toContain("Helping Hand");
  });

  it("reduces damage by 0.75 with Friend Guard on the defender's side", () => {
    const atk = battlerFromSet(attacker());
    const def = battlerFromSet(incineroar());
    const field = emptyField("doubles");

    const plain = calculateDamage(atk, def, "Earthquake", field);
    const guarded = calculateDamage(atk, def, "Earthquake", {
      ...field,
      defenderSide: { ...field.defenderSide, friendGuard: true },
    });
    expect(Math.abs(guarded.max / plain.max - 0.75)).toBeLessThan(0.02);
    expect(guarded.description).toContain("Friend Guard");
    expect(guarded.koText).not.toBe(plain.koText);
  });
});
