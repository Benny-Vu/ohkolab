import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { getAbility, getItem } from "@/data";
import {
  useDisplayDescription,
  useDisplayName,
  type DescriptionKind,
} from "@/data/display-names";
import { setLocale } from "@/lib/i18n/locale";

function Probe() {
  const displayNameFor = useDisplayName();
  return (
    <span data-testid="name">{displayNameFor("species", "garchomp")}</span>
  );
}

function DescriptionProbe({ kind, id }: { kind: DescriptionKind; id: string }) {
  const descriptionFor = useDisplayDescription();
  return <span data-testid="desc">{descriptionFor(kind, id)}</span>;
}

describe("useDisplayName", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("shows English, then Japanese once the locale is ja", async () => {
    render(<Probe />);
    expect(screen.getByTestId("name")).toHaveTextContent("Garchomp");

    act(() => setLocale("ja"));
    // The names arrive from the lazy chunk, not the first ja render.
    await waitFor(() =>
      expect(screen.getByTestId("name")).toHaveTextContent("ガブリアス"),
    );

    act(() => setLocale("en"));
    expect(screen.getByTestId("name")).toHaveTextContent("Garchomp");
  });

  it("keeps English while the locale is en", () => {
    render(<Probe />);
    // No Japanese names load for an English session; the probe stays English.
    expect(screen.getByTestId("name")).toHaveTextContent("Garchomp");
  });
});

describe("useDisplayDescription", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("shows the English short description, then the Japanese one", async () => {
    render(<DescriptionProbe kind="ability" id="intimidate" />);
    expect(screen.getByTestId("desc")).toHaveTextContent(
      getAbility("intimidate")?.shortDesc ?? "",
    );

    act(() => setLocale("ja"));
    // The Japanese text arrives with the lazy chunk, not the first render.
    await waitFor(() =>
      expect(screen.getByTestId("desc")).toHaveTextContent(/^[぀-ヿ㐀-鿿]/),
    );
  });

  it("keeps English for entries without Japanese text", async () => {
    render(<DescriptionProbe kind="item" id="Chesnaughtite" />);
    const english = getItem("Chesnaughtite")?.shortDesc ?? "";
    expect(screen.getByTestId("desc")).toHaveTextContent(english);

    act(() => setLocale("ja"));
    // Wait for the chunk via an entry that does get Japanese text…
    render(<DescriptionProbe kind="ability" id="intimidate" />);
    await waitFor(() =>
      expect(screen.getAllByTestId("desc")[1]).toHaveTextContent(
        /^[぀-ヿ㐀-鿿]/,
      ),
    );
    // …then the Mega Stone's description is still the English fallback.
    expect(screen.getAllByTestId("desc")[0]).toHaveTextContent(english);
  });
});
