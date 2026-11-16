import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ItemPicker } from "@/components/pokemon-editor/item-picker";

describe("ItemPicker", () => {
  it("shows the current item", () => {
    render(<ItemPicker value="Life Orb" onChange={() => undefined} />);

    expect(screen.getByText("Life Orb")).toBeInTheDocument();
  });

  it("picks no item", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ItemPicker value="Life Orb" onChange={onChange} />);

    await user.click(screen.getByRole("combobox", { name: "Item" }));
    await user.click(screen.getByRole("option", { name: /^None$/ }));

    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("picks an item from the search results", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ItemPicker value={null} onChange={onChange} />);

    await user.click(screen.getByRole("combobox", { name: "Item" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search items" }),
      "life orb",
    );
    await user.click(screen.getByText("Life Orb"));

    expect(onChange).toHaveBeenLastCalledWith("Life Orb");
  });

  it("lists the species' Mega Stones under their own heading", async () => {
    const user = userEvent.setup();
    render(
      <ItemPicker value={null} onChange={() => undefined} species="Garchomp" />,
    );

    await user.click(screen.getByRole("combobox", { name: "Item" }));

    expect(screen.getByText("Mega Stones")).toBeInTheDocument();
    expect(screen.getByText("Garchompite")).toBeInTheDocument();
  });
});
