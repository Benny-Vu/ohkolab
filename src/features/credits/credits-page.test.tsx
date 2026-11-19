import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setLocale } from "@/lib/i18n/locale";
import { CreditsPage } from "@/features/credits/credits-page";

/**
 * The credits page names every data source and library, in both languages,
 * and keeps PokéAPI's copyright notice verbatim — its BSD licence requires
 * the notice to travel with the data.
 */
describe("CreditsPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    setLocale("en");
    localStorage.clear();
  });

  it("lists the data sources and libraries with their licences", () => {
    setLocale("en");
    render(<CreditsPage />);

    expect(
      screen.getByRole("heading", { name: "Credits" }),
    ).toBeInTheDocument();
    expect(screen.getByText("PokéAPI")).toBeInTheDocument();
    expect(
      screen.getByText("@smogon/calc", { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByText("SIL Open Font License 1.1")).toBeInTheDocument();
    expect(screen.getByText("ISC License")).toBeInTheDocument();
  });

  it("keeps PokéAPI's copyright notice verbatim in English mode", () => {
    setLocale("en");
    render(<CreditsPage />);

    expect(
      screen.getByText(
        "Copyright (c) © 2013–2023 Paul Hallett and PokéAPI contributors (https://github.com/PokeAPI/pokeapi#contributing). Pokémon and Pokémon character names are trademarks of Nintendo.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the Japanese list in Japanese mode, notice verbatim", () => {
    setLocale("ja");
    render(<CreditsPage />);

    expect(screen.getByText("日本語のポケモン名。")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Copyright (c) © 2013–2023 Paul Hallett and PokéAPI contributors (https://github.com/PokeAPI/pokeapi#contributing). Pokémon and Pokémon character names are trademarks of Nintendo.",
      ),
    ).toBeInTheDocument();
  });
});
