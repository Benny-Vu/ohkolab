import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MovePicker } from "@/components/pokemon-editor/move-picker";

describe("MovePicker", () => {
  it("shows the chosen move", () => {
    render(<MovePicker value="Earthquake" onChange={() => undefined} />);

    expect(screen.getByText("Earthquake")).toBeInTheDocument();
    expect(screen.getByText("Earthquake")).toHaveClass("truncate");
  });

  it("picks a move without a species", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MovePicker value={null} onChange={onChange} />);

    await user.click(screen.getByRole("combobox", { name: "Move" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search moves" }),
      "earthquake",
    );
    await user.click(screen.getByText("Earthquake"));

    expect(onChange).toHaveBeenLastCalledWith("Earthquake");
  });

  it("groups moves the species can learn", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MovePicker value={null} onChange={onChange} species="Garchomp" />);

    await user.click(screen.getByRole("combobox", { name: "Move" }));
    await waitFor(() =>
      expect(screen.getByText("Learned by Garchomp")).toBeInTheDocument(),
    );
    await user.type(
      screen.getByRole("combobox", { name: "Search moves" }),
      "earthquake",
    );
    await user.click(screen.getByRole("option", { name: /Earthquake/ }));

    expect(onChange).toHaveBeenLastCalledWith("Earthquake");
  });

  it("excludes the given moves", async () => {
    const user = userEvent.setup();
    render(
      <MovePicker
        value={null}
        onChange={() => undefined}
        exclude={["Earthquake"]}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Move" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search moves" }),
      "earthquake",
    );

    expect(screen.getByText("No move found.")).toBeInTheDocument();
  });

  it("clears the chosen move", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MovePicker value="Earthquake" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Clear Move" }));

    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
