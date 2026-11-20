import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setLocale } from "@/lib/i18n/locale";
import { PressPage } from "@/features/press/press-page";

/**
 * The press kit hands out logos, brand values, screenshots and press copy
 * in both languages, and always carries the unofficial-fan-project line.
 */
describe("PressPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    setLocale("en");
    localStorage.clear();
  });

  it("links every logo asset in both formats", () => {
    setLocale("en");
    render(<PressPage />);

    expect(
      screen.getByRole("heading", { name: "Press kit" }),
    ).toBeInTheDocument();
    for (const slug of [
      "logo-mark-dark",
      "logo-mark-light",
      "wordmark-dark",
      "wordmark-light",
      "lockup-dark",
      "lockup-light",
    ]) {
      expect(
        document.querySelector(`a[href="/press/${slug}.svg"]`),
      ).toBeTruthy();
      expect(
        document.querySelector(`a[href="/press/${slug}.png"]`),
      ).toBeTruthy();
    }
  });

  it("shows the brand values and fonts", () => {
    setLocale("en");
    render(<PressPage />);

    expect(screen.getAllByText("#C8F031").length).toBeGreaterThan(0);
    expect(screen.getByText(/Barlow Semi Condensed/)).toBeInTheDocument();
    expect(screen.getByText(/IBM Plex Sans/)).toBeInTheDocument();
    expect(screen.getByText(/IBM Plex Mono/)).toBeInTheDocument();
  });

  it("links the six screenshots", () => {
    setLocale("en");
    render(<PressPage />);

    for (const file of [
      "home.png",
      "calc.png",
      "teams.png",
      "meta.png",
      "groups.png",
      "messages.png",
    ]) {
      expect(
        document.querySelector(`a[href="/press/screenshots/${file}"]`),
      ).toBeTruthy();
    }
  });

  it("shows the press copy in both languages and the fan-project line", () => {
    setLocale("en");
    render(<PressPage />);

    expect(
      screen.getByText(
        "OHKOLab is a free community and toolkit for Pokémon Champions players: a damage calculator, a team builder with printable team sheets, real usage statistics, groups and direct messages — in English and Japanese.",
      ),
    ).toBeInTheDocument();
    // The Japanese long copy is always shown too, so both languages are
    // available whatever the viewer's locale is.
    expect(screen.getByText(/非公式の/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/not affiliated with Nintendo/).length,
    ).toBeGreaterThan(0);
  });

  it("renders the Japanese headings in Japanese mode", () => {
    setLocale("ja");
    render(<PressPage />);

    expect(
      screen.getByRole("heading", { name: "プレスキット" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ロゴ" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "カラーとフォント" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/任天堂・ゲームフリーク/).length,
    ).toBeGreaterThan(0);
  });
});
