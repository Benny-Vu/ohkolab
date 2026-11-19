import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { TeamPreview } from "@/components/team-preview/team-preview";
import { setLocale } from "@/lib/i18n/locale";
import { emptyStatsTable, type PokemonSet } from "@/types/pokemon";

/** A minimal member for preview tests. */
function set(overrides: Partial<PokemonSet> = {}): PokemonSet {
  return {
    species: "Garchomp",
    item: "Life Orb",
    ability: "Rough Skin",
    nature: "Jolly",
    statPoints: emptyStatsTable(),
    moves: ["Earthquake", null, null, null],
    ...overrides,
  };
}

function teamOf(count: number): { members: PokemonSet[] } {
  return {
    members: Array.from({ length: count }, (_, index) =>
      set({ species: index === 0 ? "Garchomp" : "Incineroar" }),
    ),
  };
}

beforeEach(() => {
  setLocale("en");
});

describe("TeamPreview compact", () => {
  it("renders one row of six slots: the members plus dashed placeholders", () => {
    render(<TeamPreview team={teamOf(3)} variant="compact" />);

    const list = screen.getByRole("list", { name: "Team preview" });
    expect(list).toBeInTheDocument();
    expect(list.children).toHaveLength(6);
    // Three sprites and three placeholders (placeholders are aria-hidden).
    expect(screen.getAllByRole("img", { name: "Incineroar" })).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Garchomp" })).toBeInTheDocument();
  });

  it("reads out the item name with each Pokémon", () => {
    render(<TeamPreview team={teamOf(1)} variant="compact" />);

    expect(screen.getByRole("img", { name: "Life Orb" })).toBeInTheDocument();
  });

  it("shows every slot for a full team of six", () => {
    render(<TeamPreview team={teamOf(6)} variant="compact" />);

    expect(
      screen.getByRole("list", { name: "Team preview" }).children,
    ).toHaveLength(6);
    expect(
      screen.getAllByRole("img", { name: /Garchomp|Incineroar/ }),
    ).toHaveLength(6);
  });
});

describe("TeamPreview expanded", () => {
  it("shows name, item, ability, nature and moves per slot", () => {
    render(<TeamPreview team={teamOf(1)} variant="expanded" />);

    expect(screen.getByText("Garchomp")).toBeInTheDocument();
    expect(screen.getByText("Life Orb")).toBeInTheDocument();
    expect(screen.getByText("Rough Skin")).toBeInTheDocument();
    expect(screen.getByText("Jolly")).toBeInTheDocument();
    expect(screen.getByText("Earthquake")).toBeInTheDocument();
  });

  it("fills the remaining slots with placeholders", () => {
    render(<TeamPreview team={teamOf(1)} variant="expanded" />);

    expect(
      screen.getByRole("list", { name: "Team preview" }).children,
    ).toHaveLength(6);
  });

  it("shows the Mega Stone as the held item", () => {
    render(
      <TeamPreview
        team={{ members: [set({ item: "Garchompite" })] }}
        variant="expanded"
      />,
    );

    expect(
      screen.getByRole("img", { name: "Garchompite" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Garchompite")).toBeInTheDocument();
  });

  it("uses the nickname when the Pokémon has one", () => {
    render(
      <TeamPreview
        team={{ members: [set({ nickname: "Chompy" })] }}
        variant="expanded"
      />,
    );

    expect(screen.getByText("Chompy")).toBeInTheDocument();
  });
});

describe("TeamPreview in Japanese", () => {
  afterEach(() => {
    setLocale("en");
  });

  it("localizes the names, item, nature and moves", async () => {
    setLocale("ja");
    render(<TeamPreview team={teamOf(1)} variant="expanded" />);

    // The Japanese names arrive from the lazy chunk.
    expect(await screen.findByText("ガブリアス")).toBeInTheDocument();
    expect(await screen.findByText("いのちのたま")).toBeInTheDocument();
    expect(await screen.findByText("ようき")).toBeInTheDocument();
    expect(await screen.findByText("じしん")).toBeInTheDocument();
  });
});
