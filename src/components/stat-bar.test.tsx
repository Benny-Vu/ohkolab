import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatBar } from "@/components/stat-bar";

describe("StatBar", () => {
  it("fills proportionally to the value", () => {
    render(<StatBar value={16} max={32} tone="accent" />);

    const fill = screen.getByRole("img", { name: "16 of 32" }).firstChild;
    expect(fill).toHaveStyle({ width: "50%" });
  });

  it("clamps above the maximum", () => {
    render(<StatBar value={40} max={32} />);

    const fill = screen.getByRole("img", { name: "40 of 32" }).firstChild;
    expect(fill).toHaveStyle({ width: "100%" });
  });

  it("handles a zero maximum without dividing by zero", () => {
    render(<StatBar value={0} max={0} />);

    expect(screen.getByRole("img", { name: "0 of 1" })).toBeInTheDocument();
  });
});
