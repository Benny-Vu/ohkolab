import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { createDefaultSet } from "@/data";
import type { PokemonSet } from "@/types/pokemon";
import { SpeedTiers } from "@/features/team-builder/speed-tiers";

function set(species: string, patch: Partial<PokemonSet> = {}): PokemonSet {
  return { ...createDefaultSet(species), ...patch };
}

test("lists the team from fastest to slowest", () => {
  render(<SpeedTiers members={[set("Incineroar"), set("Gengar"), set("Garchomp")]} />);

  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(3);
  expect(within(items[0]).getByText("Gengar")).toBeInTheDocument();
  expect(within(items[1]).getByText("Garchomp")).toBeInTheDocument();
  expect(within(items[2]).getByText("Incineroar")).toBeInTheDocument();
  expect(items[0].textContent).toMatch(/\d/);
});

test("explains when the team is empty", () => {
  render(<SpeedTiers members={[]} />);

  expect(screen.getByText("No Pokémon on this team yet.")).toBeInTheDocument();
});
