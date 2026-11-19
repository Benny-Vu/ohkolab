import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo, LogoMark } from "@/components/logo";

describe("LogoMark", () => {
  it("renders the struck-target mark, hidden from assistive tech", () => {
    const { container } = render(<LogoMark />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("viewBox", "0 0 32 32");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    // Tile, ring and strike are all present.
    expect(container.querySelector("rect")).not.toBeNull();
    expect(container.querySelector("circle")).not.toBeNull();
    expect(container.querySelector("line")).not.toBeNull();
  });
});

describe("Logo", () => {
  it("renders the mark next to the wordmark", () => {
    const { container } = render(<Logo />);
    expect(screen.getByText("OHKO")).toBeInTheDocument();
    expect(screen.getByText("Lab")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
