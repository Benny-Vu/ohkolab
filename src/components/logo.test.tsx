import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo, LogoMark } from "@/components/logo";

describe("LogoMark", () => {
  it("renders the split-O mark, hidden from assistive tech", () => {
    const { container } = render(<LogoMark />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("viewBox", "0 0 100 100");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    // The mark is two paths — the split ring's arcs and the diagonal bar —
    // with no tile behind them, themed through the accent-text colour.
    expect(container.querySelectorAll("path")).toHaveLength(2);
    expect(container.querySelector("rect")).toBeNull();
    expect(svg).toHaveClass("text-accent-brand-text");
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
