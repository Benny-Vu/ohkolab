import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NumberStepper } from "@/components/number-stepper";

describe("NumberStepper", () => {
  it("clamps to the maximum", () => {
    const onChange = vi.fn();
    render(
      <NumberStepper value={32} onChange={onChange} max={32} label="HP" />,
    );

    screen.getByRole("button", { name: "Increase HP" }).click();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("clamps to the minimum", () => {
    const onChange = vi.fn();
    render(<NumberStepper value={0} onChange={onChange} min={0} label="HP" />);

    screen.getByRole("button", { name: "Decrease HP" }).click();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("respects the remaining budget", () => {
    const onChange = vi.fn();
    render(
      <NumberStepper
        value={30}
        onChange={onChange}
        max={32}
        remaining={1}
        label="HP"
      />,
    );

    screen.getByRole("button", { name: "Increase HP" }).click();

    expect(onChange).toHaveBeenCalledWith(31);
  });

  it("shows the remaining budget", () => {
    render(
      <NumberStepper
        value={10}
        onChange={() => {}}
        remaining={16}
        label="HP"
      />,
    );

    expect(screen.getByText("16 left")).toBeInTheDocument();
  });
});
