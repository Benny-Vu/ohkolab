import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { createDefaultSet } from "@/data";
import { setLocale } from "@/lib/i18n/locale";
import type { PokemonSet } from "@/types/pokemon";
import { SpeedTiers } from "@/features/team-builder/speed-tiers";

function set(species: string, patch: Partial<PokemonSet> = {}): PokemonSet {
  return { ...createDefaultSet(species), ...patch };
}

test("lists the team from fastest to slowest", () => {
  render(
    <SpeedTiers
      members={[set("Incineroar"), set("Gengar"), set("Garchomp")]}
    />,
  );

  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(3);
  const [first, second, third] = items;
  if (!first || !second || !third) throw new Error("missing tier rows");
  expect(within(first).getByText("Gengar")).toBeInTheDocument();
  expect(within(second).getByText("Garchomp")).toBeInTheDocument();
  expect(within(third).getByText("Incineroar")).toBeInTheDocument();
  expect(first.textContent).toMatch(/\d/);
});

test("explains when the team is empty", () => {
  render(<SpeedTiers members={[]} />);

  expect(screen.getByText("No Pokémon on this team yet.")).toBeInTheDocument();
});

test("offers the scarf, tailwind and trick room views", () => {
  render(<SpeedTiers members={[set("Garchomp")]} />);

  const group = screen.getByRole("radiogroup", { name: "Speed tier view" });
  for (const label of ["Base", "Scarf ×1.5", "Tailwind ×2", "Trick Room"]) {
    expect(within(group).getByText(label)).toBeTruthy();
  }
});

test("applies the scarf and tailwind multipliers to the speeds", async () => {
  const user = userEvent.setup();
  render(<SpeedTiers members={[set("Garchomp")]} />);

  const row = () => screen.getAllByRole("listitem")[0]!;
  const baseSpeed = Number(row().textContent!.match(/\d+/)![0]);

  await user.click(screen.getByText("Scarf ×1.5"));
  expect(Number(row().textContent!.match(/\d+/)![0])).toBe(
    Math.floor(baseSpeed * 1.5),
  );

  await user.click(screen.getByText("Tailwind ×2"));
  expect(Number(row().textContent!.match(/\d+/)![0])).toBe(baseSpeed * 2);
});

test("trick room reverses the order and explains priority still applies", async () => {
  const user = userEvent.setup();
  render(
    <SpeedTiers
      members={[set("Incineroar"), set("Gengar"), set("Garchomp")]}
    />,
  );

  const names = () =>
    screen.getAllByRole("listitem").map((item) => item.textContent);
  const baseOrder = names();

  await user.click(screen.getByText("Trick Room"));
  expect(names()).toEqual([...baseOrder].reverse());
  expect(screen.getByText(/Priority moves still go first/)).toBeInTheDocument();
});

test("labels the tiers with Japanese species names", async () => {
  setLocale("ja");
  try {
    render(<SpeedTiers members={[set("Incineroar"), set("Garchomp")]} />);

    expect(await screen.findByText("ガブリアス")).toBeInTheDocument();
    expect(screen.getByText("ガオガエン")).toBeInTheDocument();
    expect(screen.queryByText("Garchomp")).not.toBeInTheDocument();
  } finally {
    setLocale("en");
  }
});
