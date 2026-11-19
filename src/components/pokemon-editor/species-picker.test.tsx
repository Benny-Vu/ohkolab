import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SpeciesPicker } from "@/components/pokemon-editor/species-picker";

describe("SpeciesPicker", () => {
  it("shows a placeholder until a species is picked", () => {
    render(<SpeciesPicker value={null} onChange={() => undefined} />);

    expect(screen.getByRole("combobox", { name: "Species" })).toHaveTextContent(
      "Choose a Pokémon",
    );
  });

  it("forwards its id so a <label htmlFor> can point at the trigger", () => {
    render(
      <SpeciesPicker
        id="avatar-species"
        value={null}
        onChange={() => undefined}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Species" });
    expect(trigger).toHaveAttribute("id", "avatar-species");
  });

  it("picks a species from the search results", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SpeciesPicker value={null} onChange={onChange} />);

    await user.click(screen.getByRole("combobox", { name: "Species" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search Pokémon" }),
      "garchomp",
    );
    await user.click(screen.getByText("Garchomp"));

    expect(onChange).toHaveBeenLastCalledWith("Garchomp");
  });

  it("hides battle-only formes unless asked for", async () => {
    const user = userEvent.setup();
    render(<SpeciesPicker value={null} onChange={() => undefined} />);

    await user.click(screen.getByRole("combobox", { name: "Species" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search Pokémon" }),
      "garchomp",
    );

    expect(screen.getByText("Garchomp")).toBeInTheDocument();
    expect(screen.queryByText("Garchomp-Mega")).toBeNull();
  });

  it("offers battle-only formes when allowed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SpeciesPicker value={null} onChange={onChange} allowBattleOnly />);

    await user.click(screen.getByRole("combobox", { name: "Species" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search Pokémon" }),
      "garchomp",
    );
    await user.click(screen.getByText("Garchomp-Mega"));

    expect(onChange).toHaveBeenLastCalledWith("Garchomp-Mega");
  });
});
