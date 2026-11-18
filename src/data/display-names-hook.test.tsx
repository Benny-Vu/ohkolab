import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useDisplayName } from "@/data/display-names";
import { setLocale } from "@/lib/i18n/locale";

function Probe() {
  const displayNameFor = useDisplayName();
  return (
    <span data-testid="name">{displayNameFor("species", "garchomp")}</span>
  );
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
