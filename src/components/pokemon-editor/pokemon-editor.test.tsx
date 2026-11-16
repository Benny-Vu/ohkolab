import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { PokemonEditor } from "@/components/pokemon-editor";
import { createDefaultSet } from "@/data";
import type { PokemonSet } from "@/types/pokemon";

function Harness({
  species = "Garchomp",
  onChange,
}: {
  species?: string;
  onChange: (set: PokemonSet) => void;
}) {
  const [value, setValue] = useState(() => createDefaultSet(species));

  return (
    <PokemonEditor
      value={value}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

function renderEditor(species?: string) {
  const onChange = vi.fn();
  render(<Harness species={species} onChange={onChange} />);

  return onChange;
}

async function pickItem(
  user: ReturnType<typeof userEvent.setup>,
  query: string,
  target: string,
) {
  await user.click(screen.getByRole("combobox", { name: "Item" }));
  await user.type(
    screen.getByRole("combobox", { name: "Search items" }),
    query,
  );
  await user.click(screen.getByText(target));
}

async function pickMove(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  name: string,
) {
  await user.click(screen.getByRole("combobox", { name: label }));
  await waitFor(() =>
    expect(screen.getByText("Learned by Garchomp")).toBeInTheDocument(),
  );
  await user.type(screen.getByRole("combobox", { name: "Search moves" }), name);
  await user.click(screen.getByRole("option", { name: new RegExp(name, "i") }));
}

describe("PokemonEditor", () => {
  it("edits the item, nature and moves through onChange", async () => {
    const user = userEvent.setup();
    const onChange = renderEditor();

    await pickItem(user, "life orb", "Life Orb");
    await user.click(screen.getByRole("combobox", { name: "Nature" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search natures" }),
      "jolly",
    );
    await user.click(screen.getByRole("option", { name: /Jolly/ }));
    await pickMove(user, "Move 1", "earthquake");

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
    const onChange = renderEditor();

    await pickItem(user, "life orb", "Life Orb");
    await user.click(screen.getByRole("combobox", { name: "Species" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search Pokémon" }),
      "incineroar",
    );
    await user.click(screen.getByRole("option", { name: /Incineroar/ }));

    expect(onChange).toHaveBeenLastCalledWith(createDefaultSet("Incineroar"));
  });

  it("clamps Stat Points to the per-stat and total limits", async () => {
    const user = userEvent.setup();
    const onChange = renderEditor();

    await user.type(screen.getByLabelText("HP"), "40");
    expect(screen.getByLabelText("HP")).toHaveValue(32);
    expect(screen.getByText("34 of 66 remaining")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Atk"), "40");
    expect(screen.getByLabelText("Atk")).toHaveValue(32);
    expect(screen.getByText("2 of 66 remaining")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Def"), "5");
    expect(screen.getByLabelText("Def")).toHaveValue(2);
    expect(screen.getByText("0 of 66 remaining")).toBeInTheDocument();

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        statPoints: { hp: 32, atk: 32, def: 2, spa: 0, spd: 0, spe: 0 },
      }),
    );
  });

  it("shows the final stats", () => {
    renderEditor();

    expect(
      screen.getByText((_, element) => element?.textContent === "Final HP 183"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) => element?.textContent === "Final Spe 122",
      ),
    ).toBeInTheDocument();
  });

  it("shows the Mega forme when its Mega Stone is held", async () => {
    const user = userEvent.setup();
    renderEditor();

    await pickItem(user, "garchomp", "Garchompite");

    expect(screen.getByAltText("Garchomp-Mega")).toBeInTheDocument();
    expect(screen.getByText("Garchomp-Mega")).toBeInTheDocument();
  });

  it("shows the Mega forme's types when they change", async () => {
    const user = userEvent.setup();
    renderEditor("Gyarados");

    await pickItem(user, "gyarados", "Gyaradosite");

    expect(screen.getByAltText("Gyarados-Mega")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.queryByText("Flying")).toBeNull();
  });

  it("offers only the species' abilities", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("combobox", { name: "Ability" }));

    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(
      screen.getByRole("option", { name: /Sand Veil/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Rough Skin/ }),
    ).toBeInTheDocument();
  });

  it("excludes moves already in other slots", async () => {
    const user = userEvent.setup();
    renderEditor();

    await pickMove(user, "Move 1", "earthquake");
    await user.click(screen.getByRole("combobox", { name: "Move 2" }));
    await waitFor(() =>
      expect(screen.getByText("Learned by Garchomp")).toBeInTheDocument(),
    );
    await user.type(
      screen.getByRole("combobox", { name: "Search moves" }),
      "earthquake",
    );

    expect(screen.getByText("No move found.")).toBeInTheDocument();
  });
});
