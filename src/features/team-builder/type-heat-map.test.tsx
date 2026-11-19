import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { createDefaultSet } from "@/data";
import { setLocale } from "@/lib/i18n/locale";
import { TYPE_NAMES, type PokemonSet, type TypeName } from "@/types/pokemon";
import { TypeHeatMap } from "@/features/team-builder/type-heat-map";

function set(species: string, patch: Partial<PokemonSet> = {}): PokemonSet {
  return { ...createDefaultSet(species), ...patch };
}

function typeCell(row: HTMLElement, type: TypeName): HTMLElement {
  const cell = within(row).getAllByRole("cell")[TYPE_NAMES.indexOf(type)];
  if (!cell) throw new Error(`missing cell for ${type}`);
  return cell;
}

test("shows one row per member with a column per type", () => {
  render(<TypeHeatMap members={[set("Garchomp")]} mode="defense" />);

  const table = screen.getByRole("table");
  expect(table.querySelectorAll("thead th")).toHaveLength(19);
  expect(screen.getByText("Nor")).toBeInTheDocument();
  expect(screen.getByText("Fai")).toBeInTheDocument();

  const row = screen
    .getByRole("rowheader", { name: "Garchomp" })
    .closest("tr") as HTMLElement;
  expect(typeCell(row, "Electric")).toHaveTextContent("0");
  expect(typeCell(row, "Ice")).toHaveTextContent("4");
  expect(typeCell(row, "Ice").className).toContain("text-destructive");
  expect(typeCell(row, "Water")).toBeEmptyDOMElement();
});

test("shows each move type against every defending type", () => {
  render(
    <TypeHeatMap
      members={[set("Garchomp", { moves: ["Earthquake", null, null, null] })]}
      mode="offense"
    />,
  );

  expect(
    screen.getByRole("columnheader", { name: "Move type" }),
  ).toBeInTheDocument();

  const row = screen
    .getByRole("rowheader", { name: "Ground" })
    .closest("tr") as HTMLElement;
  expect(typeCell(row, "Fire")).toHaveTextContent("2");
  expect(typeCell(row, "Fire").className).toContain("text-success");
  expect(typeCell(row, "Flying")).toHaveTextContent("0");
  expect(typeCell(row, "Grass")).toHaveTextContent("½");
  expect(typeCell(row, "Grass").className).toContain("text-destructive");
});

test("explains when the team has no damaging moves", () => {
  render(<TypeHeatMap members={[set("Garchomp")]} mode="offense" />);

  expect(
    screen.getByText("No damaging moves on this team yet."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

test("marks unknown species with a dash", () => {
  render(<TypeHeatMap members={[set("Not a real Pokémon")]} mode="defense" />);

  const row = screen
    .getByRole("rowheader", { name: "Not a real Pokémon" })
    .closest("tr") as HTMLElement;
  expect(typeCell(row, "Ice")).toHaveTextContent("—");
});

test("applies ability effects and names them under the table", () => {
  render(
    <TypeHeatMap
      members={[set("Rotom-Wash", { ability: "Levitate" })]}
      mode="defense"
    />,
  );

  const row = screen
    .getByRole("rowheader", { name: "Rotom-Wash" })
    .closest("tr") as HTMLElement;
  const ground = typeCell(row, "Ground");
  expect(ground).toHaveTextContent("0");
  expect(ground).toHaveAttribute(
    "title",
    "Rotom-Wash: Levitate makes it immune to Ground",
  );
  expect(
    screen.getByText("Rotom-Wash: Levitate makes it immune to Ground"),
  ).toBeInTheDocument();
});

test("highlights the columns three or more members are weak to", () => {
  render(
    <TypeHeatMap
      members={[set("Garchomp"), set("Dragonite"), set("Salamence")]}
      mode="defense"
    />,
  );

  expect(screen.getByText("Ice").className).toContain("ring-destructive");
  expect(screen.getByText("Fir").className).not.toContain("ring-destructive");
});

test("highlights the offense columns the team cannot cover", () => {
  render(
    <TypeHeatMap
      members={[set("Garchomp", { moves: ["Earthquake", null, null, null] })]}
      mode="offense"
    />,
  );

  // Flying is immune to the team's only move type: a coverage gap.
  expect(screen.getByText("Fly").className).toContain("ring-destructive");
  // Rock, however, is hit super-effectively by Earthquake.
  expect(screen.getByText("Roc").className).not.toContain("ring-destructive");
});

test("labels rows and columns with Japanese names", async () => {
  setLocale("ja");
  try {
    render(
      <TypeHeatMap
        members={[set("Garchomp", { moves: ["Earthquake", null, null, null] })]}
        mode="offense"
      />,
    );

    // Row labels are the move types, columns the defending types.
    expect(
      await screen.findByRole("rowheader", { name: "じめん" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("ドラゴン").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ground")).not.toBeInTheDocument();
  } finally {
    setLocale("en");
  }
});
