import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DamageMeter } from "@/components/damage-meter";

/** The three segment widths, in order: solid, striped, muted. */
function segmentWidths(): string[] {
  const meter = screen.getByRole("img");
  const segments = meter.querySelectorAll<HTMLDivElement>(":scope > div");
  expect(segments).toHaveLength(3);
  return [...segments].map((segment) => segment.style.width);
}

describe("DamageMeter", () => {
  it("shows the HP left after the maximum roll in the accessible label", () => {
    render(<DamageMeter minPercent={30} maxPercent={46} hpPercent={100} />);

    expect(
      screen.getByRole("img", {
        name: "HP left after the hit: 54 to 70 percent",
      }),
    ).toBeInTheDocument();
  });

  it("clamps the damage range to the current HP", () => {
    render(<DamageMeter minPercent={80} maxPercent={120} hpPercent={90} />);

    expect(
      screen.getByRole("img", {
        name: "HP left after the hit: 0 to 10 percent",
      }),
    ).toBeInTheDocument();
  });

  it("draws solid as the HP after the max roll, striped as the roll range, muted as the min", () => {
    render(<DamageMeter minPercent={20} maxPercent={40} hpPercent={100} />);

    expect(segmentWidths()).toEqual(["60%", "20%", "20%"]);
  });

  it("draws the learn-page example (68.3–81.2% at full HP) exactly", () => {
    render(<DamageMeter minPercent={68.3} maxPercent={81.2} hpPercent={100} />);

    // 100 − 81.2 HP left, the 12.9-point roll range, the guaranteed 68.3.
    expect(segmentWidths()).toEqual(["18.8%", "12.9%", "68.3%"]);
  });

  it("draws an OHKO with no solid segment", () => {
    render(<DamageMeter minPercent={90} maxPercent={120} hpPercent={100} />);

    // Even the minimum roll KOs, so nothing of the HP bar survives; the
    // widths still state the roll range and the guaranteed damage.
    expect(segmentWidths()).toEqual(["0%", "30%", "90%"]);
  });
});
