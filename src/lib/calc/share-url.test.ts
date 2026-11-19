import { describe, expect, it } from "vitest";

import { createDefaultSet } from "@/data";
import {
  calcShareUrl,
  compactCalcShare,
  decodeCalcShare,
  decodeCalcShareSearch,
  encodeCalcShare,
  hasCalcShareParam,
} from "@/lib/calc/share-url";
import {
  createDefaultCalcState,
  createSide,
  type CalcState,
} from "@/lib/calc/state";
import type { BoostTable } from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";

function setState(state: CalcState, changes: Partial<CalcState>): CalcState {
  return { ...state, ...changes };
}

function withSides(
  state: CalcState,
  p1: PokemonSet,
  p2: PokemonSet,
): CalcState {
  return setState(state, {
    sides: { p1: createSide(p1), p2: createSide(p2) },
  });
}

/** A state with every optional field set, so nothing is omitted in encoding. */
function fullState(): CalcState {
  const state = withSides(
    createDefaultCalcState(),
    {
      ...createDefaultSet("Charizard"),
      nickname: "Zardo",
      item: "Life Orb",
      ability: "Blaze",
      nature: "Timid",
      statPoints: { hp: 4, atk: 0, def: 0, spa: 32, spd: 0, spe: 30 },
      moves: ["Fire Blast", "Air Slash", null, null],
      gender: "F",
    },
    {
      ...createDefaultSet("Incineroar"),
      item: "Sitrus Berry",
      ability: "Intimidate",
    },
  );
  const boosts: BoostTable = { atk: -1, def: 2, spa: 0, spd: 6, spe: -6 };
  return {
    ...state,
    sides: {
      p1: {
        ...state.sides.p1,
        boosts,
        status: "brn",
        hpPercent: 42,
        crits: [false, true, false, false],
      },
      p2: { ...state.sides.p2, status: "par", hpPercent: 100 },
    },
    fieldSides: {
      p1: {
        reflect: false,
        lightScreen: true,
        auroraVeil: false,
        tailwind: true,
        helpingHand: false,
        friendGuard: false,
        stealthRock: true,
        spikes: 2,
      },
      p2: {
        reflect: false,
        lightScreen: false,
        auroraVeil: false,
        tailwind: false,
        helpingHand: false,
        friendGuard: false,
        stealthRock: false,
        spikes: 0,
      },
    },
    weather: "Rain",
    terrain: "Electric",
    gravity: true,
    trickRoom: true,
    selected: { side: "p2", slot: 3 },
  };
}

describe("encodeCalcShare / decodeCalcShare", () => {
  it("round-trips the default doubles state", () => {
    const state = createDefaultCalcState();

    const decoded = decodeCalcShare(encodeCalcShare(state, "doubles"));

    expect(decoded).not.toBeNull();
    expect(decoded?.state).toEqual(state);
    expect(decoded?.format).toBe("doubles");
  });

  it("round-trips a singles link with every optional field set", () => {
    const state = fullState();

    const decoded = decodeCalcShare(encodeCalcShare(state, "singles"));

    expect(decoded).not.toBeNull();
    expect(decoded?.format).toBe("singles");
    const round = decoded?.state;
    expect(round?.sides.p1.set).toEqual(state.sides.p1.set);
    expect(round?.sides.p1.boosts).toEqual(state.sides.p1.boosts);
    expect(round?.sides.p1.status).toBe("brn");
    expect(round?.sides.p1.hpPercent).toBe(42);
    expect(round?.sides.p1.crits).toEqual([false, true, false, false]);
    expect(round?.sides.p2.set).toEqual(state.sides.p2.set);
    expect(round?.sides.p2.status).toBe("par");
    expect(round?.fieldSides).toEqual(state.fieldSides);
    expect(round?.weather).toBe("Rain");
    expect(round?.terrain).toBe("Electric");
    expect(round?.gravity).toBe(true);
    expect(round?.trickRoom).toBe(true);
    expect(round?.selected).toEqual({ side: "p2", slot: 3 });
  });

  it("keeps URLs reasonably short", () => {
    const url = calcShareUrl(fullState(), "doubles", "https://ohkolab.com");

    expect(url.length).toBeLessThan(600);
    expect(url).toMatch(/^https:\/\/ohkolab\.com\/calc\?c=v1\.[A-Za-z0-9_-]+$/);
  });

  it("omits defaults from the compact payload", () => {
    const compact = compactCalcShare(createDefaultCalcState(), "doubles");

    expect(compact).not.toHaveProperty("w");
    expect(compact).not.toHaveProperty("t");
    expect(compact).not.toHaveProperty("g");
    expect(compact).not.toHaveProperty("tr");
    expect(compact).not.toHaveProperty("fs");
    const side = (compact.s as unknown[])[0] as Record<string, unknown>;
    expect(side).not.toHaveProperty("b");
    expect(side).not.toHaveProperty("st");
    expect(side).not.toHaveProperty("hp");
    expect(side).not.toHaveProperty("me");
    expect(side).not.toHaveProperty("c");
  });

  it("falls back per field for names the roster does not know", () => {
    const payload = JSON.stringify({
      v: 1,
      f: "d",
      s: [{ sp: "Not A Pokemon" }, { sp: "Incineroar" }],
    });
    const param = `v1.${btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;

    const decoded = decodeCalcShare(param);

    // parseCalcState replaces the unknown species with the default side.
    expect(decoded).not.toBeNull();
    expect(decoded?.state.sides.p1.set.species).toBe("Garchomp");
  });

  it("rejects a newer version", () => {
    const payload = JSON.stringify({
      v: 2,
      f: "d",
      s: [{ sp: "Garchomp" }, { sp: "Incineroar" }],
    });
    const param = `v2.${btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;

    expect(decodeCalcShare(param)).toBeNull();
    expect(decodeCalcShareSearch(`?c=${param}`)).toBeNull();
  });

  it("rejects corrupted parameters", () => {
    expect(decodeCalcShare("v1.not!!base64")).toBeNull();
    expect(decodeCalcShare("v1.")).toBeNull();
    expect(decodeCalcShare("nonsense")).toBeNull();
    expect(decodeCalcShare(null)).toBeNull();
  });
});

describe("decodeCalcShareSearch", () => {
  it("reads the state out of a query string", () => {
    const state = withSides(
      createDefaultCalcState(),
      createDefaultSet("Charizard"),
      createDefaultSet("Incineroar"),
    );
    const param = encodeCalcShare(state, "singles");

    const decoded = decodeCalcShareSearch(`?c=${param}&utm=x`);

    expect(decoded?.state.sides.p1.set.species).toBe("Charizard");
    expect(decoded?.format).toBe("singles");
  });

  it("reports whether a query string carries a share parameter", () => {
    expect(hasCalcShareParam("?c=v1.abc")).toBe(true);
    expect(hasCalcShareParam("")).toBe(false);
    expect(hasCalcShareParam("?format=doubles")).toBe(false);
  });
});

describe("calcShareUrl", () => {
  it("builds an absolute URL with the encoded parameter", () => {
    const url = calcShareUrl(
      createDefaultCalcState(),
      "doubles",
      "https://ohkolab.com",
    );
    const { searchParams, origin, pathname } = new URL(url);

    expect(origin).toBe("https://ohkolab.com");
    expect(pathname).toBe("/calc");
    expect(searchParams.get("c")).toMatch(/^v1\./);
    expect(decodeCalcShare(searchParams.get("c"))?.state).toEqual(
      createDefaultCalcState(),
    );
  });

  it("uses the current window origin when none is given", () => {
    // In jsdom that is http://localhost:3000; in the deployed app,
    // https://ohkolab.com.
    const url = calcShareUrl(createDefaultCalcState(), "doubles");
    expect(url).toMatch(/^http:\/\/localhost:3000\/calc\?c=v1\./);
  });

  it("uses the current origin in a browser", () => {
    const url = calcShareUrl(
      createDefaultCalcState(),
      "doubles",
      "http://localhost:3000",
    );
    expect(url).toMatch(/^http:\/\/localhost:3000\/calc\?c=v1\./);
  });
});
