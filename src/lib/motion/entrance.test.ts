import { describe, expect, it } from "vitest";

import {
  ROW_STAGGER_MS,
  ROW_ENTRANCE,
  staggerDelay,
} from "@/lib/motion/entrance";

describe("staggerDelay", () => {
  it("spaces rows one stagger apart", () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(1)).toBe(ROW_STAGGER_MS);
    expect(staggerDelay(2)).toBe(ROW_STAGGER_MS * 2);
  });

  it("caps the delay so long lists still finish quickly", () => {
    expect(staggerDelay(100)).toBe(staggerDelay(7));
  });
});

describe("ROW_ENTRANCE", () => {
  it("is a token-based fade-and-rise that tw-animate-css plays once on mount", () => {
    expect(ROW_ENTRANCE).toContain("animate-in");
    expect(ROW_ENTRANCE).toContain("fade-in");
    expect(ROW_ENTRANCE).toContain("slide-in-from-bottom-2");
    expect(ROW_ENTRANCE).toContain("duration-(--motion-base)");
    expect(ROW_ENTRANCE).toContain("ease-(--motion-ease-out)");
  });
});
