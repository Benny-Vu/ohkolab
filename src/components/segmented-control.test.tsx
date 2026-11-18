import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "@/components/segmented-control";

const OPTIONS = [
  { value: "singles", label: "Singles" },
  { value: "doubles", label: "Doubles" },
];

describe("SegmentedControl", () => {
  it("marks the active option as checked", () => {
    render(
      <SegmentedControl
        options={OPTIONS}
        value="doubles"
        onValueChange={() => {}}
      />,
    );

    expect(screen.getByRole("radio", { name: "Doubles" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Singles" })).not.toBeChecked();
  });

  it("only the active option is in the tab order", () => {
    render(
      <SegmentedControl
        options={OPTIONS}
        value="singles"
        onValueChange={() => {}}
      />,
    );

    expect(screen.getByRole("radio", { name: "Singles" })).toHaveProperty(
      "tabIndex",
      0,
    );
    expect(screen.getByRole("radio", { name: "Doubles" })).toHaveProperty(
      "tabIndex",
      -1,
    );
  });

  it("arrow keys move the selection", () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        options={OPTIONS}
        value="singles"
        onValueChange={onValueChange}
      />,
    );

    const active = screen.getByRole("radio", { name: "Singles" });
    active.focus();
    fireEvent.keyDown(active, { key: "ArrowRight" });

    expect(onValueChange).toHaveBeenCalledWith("doubles");
  });
});
