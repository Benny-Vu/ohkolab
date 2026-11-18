import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { FormatToggle } from "@/features/metagame/format-toggle";
import { getBattleFormat, setBattleFormat } from "@/lib/preferences";

beforeEach(() => {
  localStorage.clear();
  setBattleFormat("doubles");
});

describe("FormatToggle", () => {
  it("marks the active choice", () => {
    render(<FormatToggle />);
    expect(screen.getByRole("button", { name: "Doubles" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Singles" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("follows the selection", async () => {
    const user = userEvent.setup();
    render(<FormatToggle />);
    await user.click(screen.getByRole("button", { name: "Singles" }));
    expect(getBattleFormat()).toBe("singles");
    expect(screen.getByRole("button", { name: "Singles" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Doubles" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps the active choice when pressed again", async () => {
    const user = userEvent.setup();
    render(<FormatToggle />);
    await user.click(screen.getByRole("button", { name: "Doubles" }));
    expect(getBattleFormat()).toBe("doubles");
    expect(screen.getByRole("button", { name: "Doubles" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
