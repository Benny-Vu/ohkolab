import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  ItemIcon,
  PokemonIcon,
  PokemonSprite,
} from "@/components/pokemon-sprite";
import { setLocale } from "@/lib/i18n/locale";

beforeEach(() => {
  setLocale("en");
});

describe("PokemonSprite", () => {
  it("renders the battle sprite image", () => {
    render(<PokemonSprite species="Garchomp" />);
    expect(screen.getByRole("img", { name: "Garchomp" })).toHaveAttribute(
      "width",
      "96",
    );
  });

  it("swaps to a same-size placeholder with the name when the sprite fails", () => {
    render(<PokemonSprite species="Garchomp" />);
    fireEvent.error(screen.getByRole("img", { name: "Garchomp" }));

    // The placeholder keeps the image's 96x96 box, so nothing shifts.
    const placeholder = screen.getByRole("img", { name: "Garchomp" });
    expect(placeholder).toHaveStyle({ width: "96px", height: "96px" });
    expect(screen.getByText("Garchomp")).toBeInTheDocument();
  });

  it("shows the localized name on the placeholder", async () => {
    setLocale("ja");
    render(<PokemonSprite species="Garchomp" />);
    // The Japanese names arrive from the lazy chunk.
    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: "ガブリアス" }),
      ).toBeInTheDocument(),
    );

    fireEvent.error(screen.getByRole("img", { name: "ガブリアス" }));
    expect(screen.getByRole("img", { name: "ガブリアス" })).toHaveStyle({
      width: "96px",
      height: "96px",
    });
    expect(screen.getByText("ガブリアス")).toBeInTheDocument();
  });

  it("falls back to the raw id when the species is unknown", () => {
    render(<PokemonSprite species="not-a-pokemon" />);
    fireEvent.error(screen.getByRole("img", { name: "not-a-pokemon" }));
    expect(screen.getByText("not-a-pokemon")).toBeInTheDocument();
  });
});

describe("PokemonIcon", () => {
  it("announces the localized name, not the raw id", async () => {
    setLocale("ja");
    render(<PokemonIcon species="Garchomp" />);
    // The Japanese names arrive from the lazy chunk; until then the
    // English name (never the raw id) is the accessible label.
    const wrapper = await screen.findByRole("img", { name: "ガブリアス" });
    expect(wrapper).toBeInTheDocument();
  });

  it("shows the localized name in a 40x30 placeholder when the sheet fails", async () => {
    setLocale("ja");
    render(<PokemonIcon species="Garchomp" />);
    const wrapper = await screen.findByRole("img", { name: "ガブリアス" });
    const img = wrapper.querySelector("img");
    if (!img) throw new Error("the icon sheet img is missing");
    fireEvent.error(img);

    const placeholder = screen.getByRole("img", { name: "ガブリアス" });
    expect(placeholder).toHaveStyle({ width: "40px", height: "30px" });
    expect(screen.getByText("ガブリアス")).toBeInTheDocument();
  });

  it("falls back to the raw id when the species is unknown", () => {
    render(<PokemonIcon species="not-a-pokemon" />);
    expect(
      screen.getByRole("img", { name: "not-a-pokemon" }),
    ).toBeInTheDocument();
  });
});

describe("ItemIcon", () => {
  it("shows the item name in a 24x24 placeholder when the sheet fails", () => {
    render(<ItemIcon item="Choice Band" />);
    const wrapper = screen.getByRole("img", { name: "Choice Band" });
    const img = wrapper.querySelector("img");
    if (!img) throw new Error("the item sheet img is missing");
    fireEvent.error(img);

    const placeholder = screen.getByRole("img", { name: "Choice Band" });
    expect(placeholder).toHaveStyle({ width: "24px", height: "24px" });
    expect(screen.getByText("Choice Band")).toBeInTheDocument();
  });

  it("shows the localized item name on the placeholder", async () => {
    setLocale("ja");
    render(<ItemIcon item="Choice Scarf" />);
    const wrapper = await screen.findByRole("img", {
      name: "こだわりスカーフ",
    });
    const img = wrapper.querySelector("img");
    if (!img) throw new Error("the item sheet img is missing");
    fireEvent.error(img);

    await waitFor(() =>
      expect(screen.getByText("こだわりスカーフ")).toBeInTheDocument(),
    );
    expect(screen.getByRole("img", { name: "こだわりスカーフ" })).toHaveStyle({
      width: "24px",
      height: "24px",
    });
  });

  it("announces the localized name, not the raw id", async () => {
    setLocale("ja");
    render(<ItemIcon item="Choice Scarf" />);
    expect(
      await screen.findByRole("img", { name: "こだわりスカーフ" }),
    ).toBeInTheDocument();
  });

  it("falls back to the raw id when the item is unknown", () => {
    render(<ItemIcon item="not-an-item" />);
    expect(
      screen.getByRole("img", { name: "not-an-item" }),
    ).toBeInTheDocument();
  });
});
