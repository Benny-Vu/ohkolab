import { describe, expect, it } from "vitest";

import { createCalcNameResolver } from "./names.ts";

// These tests exercise the calc-backed resolver against the real
// @smogon/calc generation 0 data, which is a dependency of this repo —
// no network access is involved.

describe("createCalcNameResolver", () => {
  const resolver = createCalcNameResolver();

  it("resolves ability, item, and move ids to display names", () => {
    expect(resolver.ability("poison-touch")).toBe("Poison Touch");
    expect(resolver.item("grassy-seed")).toBe("Grassy Seed");
    expect(resolver.move("dire-claw")).toBe("Dire Claw");
  });

  it("maps the empty item slot to Nothing", () => {
    expect(resolver.item("nothing")).toBe("Nothing");
  });

  it("maps the empty move slot to (No Move)", () => {
    expect(resolver.move("")).toBe("(No Move)");
  });

  it("normalizes ASCII apostrophes to the typographic apostrophe", () => {
    expect(resolver.species("Farfetch'd")).toBe("Farfetch\u2019d");
    expect(resolver.species("Sirfetch'd")).toBe("Sirfetch\u2019d");
  });

  it("keeps Aegislash and mega formes unchanged", () => {
    expect(resolver.species("Aegislash")).toBe("Aegislash");
    expect(resolver.species("Floette-Mega")).toBe("Floette-Mega");
  });

  it("passes unknown ids through unchanged", () => {
    expect(resolver.ability("not-an-ability")).toBe("not-an-ability");
  });
});
