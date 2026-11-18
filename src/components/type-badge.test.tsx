import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TypeBadge } from "@/components/type-badge";

describe("TypeBadge", () => {
  it("renders the type name with the uppercase class", () => {
    render(<TypeBadge type="Fire" />);

    expect(screen.getByText("Fire").className).toContain("uppercase");
  });

  it("uses the type colour as the background", () => {
    render(<TypeBadge type="Water" />);

    expect(screen.getByText("Water")).toHaveStyle({
      backgroundColor: "rgb(62, 114, 212)",
    });
  });

  it("renders the small size", () => {
    render(<TypeBadge type="Grass" size="sm" />);

    expect(screen.getByText("Grass").className).toContain("h-4");
  });
});
