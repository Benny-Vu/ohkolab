import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DamageMeter } from "@/components/damage-meter";

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

  it("renders three segments sized by percentage", () => {
    render(<DamageMeter minPercent={20} maxPercent={40} hpPercent={100} />);

    const meter = screen.getByRole("img");
    const segments = meter.querySelectorAll(":scope > div");
    expect(segments).toHaveLength(3);
    expect(segments[0]).toHaveStyle({ width: "60%" });
    expect(segments[1]).toHaveStyle({ width: "40%" });
  });
});
