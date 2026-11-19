import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatBar } from "@/components/stat-bar";

describe("StatBar", () => {
  it("fills proportionally to the value", async () => {
    render(<StatBar value={16} max={32} tone="accent" />);

    const fill = screen.getByRole("img", { name: "16 of 32" }).firstChild;
    await waitFor(() => expect(fill).toHaveStyle({ width: "50%" }));
  });

  it("clamps above the maximum", async () => {
    render(<StatBar value={40} max={32} />);

    const fill = screen.getByRole("img", { name: "40 of 32" }).firstChild;
    await waitFor(() => expect(fill).toHaveStyle({ width: "100%" }));
  });

  it("fills in from zero on mount", async () => {
    render(<StatBar value={16} max={32} tone="accent" />);

    // The transition needs a frame at zero width to have a start value.
    const fill = screen.getByRole("img", { name: "16 of 32" }).firstChild;
    expect(fill).toHaveStyle({ width: "0%" });
    await waitFor(() => expect(fill).toHaveStyle({ width: "50%" }));
  });

  it("handles a zero maximum without dividing by zero", () => {
    render(<StatBar value={0} max={0} />);

    expect(screen.getByRole("img", { name: "0 of 1" })).toBeInTheDocument();
  });
});
