import { describe, expect, it } from "vitest";

import {
  DAMAGE_ROLL_EXAMPLE,
  damageRollExample,
} from "@/features/learn/damage-roll-example";

/**
 * The live example on /learn: it must stay a real Champions calculation —
 * a full sixteen-roll range between a min and a max, and percentages of
 * the defender's max HP that the DamageMeter can show.
 */
describe("damageRollExample", () => {
  it("produces a full sixteen-roll range", () => {
    const result = damageRollExample();

    expect(result.rolls).not.toBeNull();
    expect(result.rolls).toHaveLength(16);
    expect(result.rolls?.[0]).toBe(result.min);
    expect(result.rolls?.at(-1)).toBe(result.max);
    expect(result.min).toBeLessThan(result.max);
  });

  it("expresses the range as sane percentages of the defender's HP", () => {
    const result = damageRollExample();

    expect(result.minPercent).toBeGreaterThan(0);
    expect(result.maxPercent).toBeLessThanOrEqual(100);
    expect(result.minPercent).toBeLessThan(result.maxPercent);
  });

  it("names the sample it is built from", () => {
    expect(DAMAGE_ROLL_EXAMPLE.attacker).toBe("Garchomp");
    expect(DAMAGE_ROLL_EXAMPLE.defender).toBe("Incineroar");
    expect(DAMAGE_ROLL_EXAMPLE.move).toBe("Earthquake");
  });
});
