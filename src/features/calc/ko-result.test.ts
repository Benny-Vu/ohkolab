import { describe, expect, it } from "vitest";

import { koResultOf } from "@/features/calc/ko-result";

describe("koResultOf", () => {
  it("reads the calc library's guaranteed KO text", () => {
    expect(koResultOf("guaranteed OHKO")).toBe("OHKO");
    expect(koResultOf("guaranteed 2HKO")).toBe("GUARANTEED 2HKO");
    expect(koResultOf("guaranteed 3HKO")).toBe("3HKO");
    expect(koResultOf("guaranteed 4HKO")).toBe("4HKO");
  });

  it("reads chance and plain KO text", () => {
    expect(koResultOf("possible OHKO")).toBe("OHKO");
    expect(koResultOf("possible 2HKO")).toBe("2HKO");
    expect(koResultOf("87.5% chance to 3HKO")).toBe("3HKO");
    expect(koResultOf("2HKO")).toBe("2HKO");
  });
  it("reads multi-turn and approximate text", () => {
    expect(koResultOf("KO in 2 turns")).toBe("2HKO");
    expect(koResultOf("KO in 4 turns")).toBe("4HKO");
    expect(koResultOf("approx. 2HKO")).toBe("2HKO");
  });
  it("ignores hazards suffixes and returns null for anything else", () => {
    expect(koResultOf("guaranteed 2HKO after Stealth Rock")).toBe(
      "GUARANTEED 2HKO",
    );
    expect(koResultOf("not a KO")).toBeNull();
    expect(koResultOf("KO in 6 turns")).toBeNull();
    expect(koResultOf(undefined)).toBeNull();
    expect(koResultOf("")).toBeNull();
  });
});
