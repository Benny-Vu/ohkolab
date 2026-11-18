import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KoLabel } from "@/components/ko-label";

describe("KoLabel", () => {
  it("renders an OHKO as a filled pill", () => {
    render(<KoLabel result="OHKO" />);

    const label = screen.getByText("OHKO");
    expect(label.className).toContain("bg-damage-ohko");
  });

  it("renders a 2HKO as a filled pill", () => {
    render(<KoLabel result="2HKO" />);

    const label = screen.getByText("2HKO");
    expect(label.className).toContain("bg-damage-2hko");
  });

  it("renders weaker results as coloured text without a fill", () => {
    render(<KoLabel result="3HKO" />);

    const label = screen.getByText("3HKO");
    expect(label.className).toContain("text-damage-3hko");
    expect(label.className).toContain("bg-transparent");
  });

  it("renders no damage as muted text", () => {
    render(<KoLabel result="No damage" />);

    expect(screen.getByText("No damage")).toBeInTheDocument();
  });
});
