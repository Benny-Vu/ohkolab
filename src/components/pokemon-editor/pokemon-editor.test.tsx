import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { PokemonEditor } from "@/components/pokemon-editor";
import { createDefaultSet } from "@/data";
import type { PokemonSet } from "@/types/pokemon";

function Harness({ onChange }: { onChange: (set: PokemonSet) => void }) {
  const [set, setSet] = useState(() => createDefaultSet("Garchomp"));
  return (
    <PokemonEditor
      value={set}
      onChange={(next) => {
        setSet(next);
        onChange(next);
      }}
    />
  );
}

describe("PokemonEditor", () => {
  it("edits item, nature and moves through onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Item"), "Life Orb");
    await user.selectOptions(screen.getByLabelText("Nature"), "Jolly");
    await user.selectOptions(screen.getByLabelText("Move 1"), "Earthquake");

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        species: "Garchomp",
        item: "Life Orb",
        nature: "Jolly",
        moves: ["Earthquake", null, null, null],
      }),
    );
  });

  it("resets the set when the species changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Item"), "Life Orb");
    await user.selectOptions(screen.getByLabelText("Species"), "Incineroar");

    expect(onChange).toHaveBeenLastCalledWith(createDefaultSet("Incineroar"));
  });
});
