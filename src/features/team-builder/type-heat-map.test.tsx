import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { createDefaultSet } from "@/data";
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
