import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeToggle } from "@/components/theme-toggle";
import { setLocale } from "@/lib/i18n/locale";
import { setTheme } from "@/lib/theme";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    setTheme("dark");
  });

  it("names the button for the theme it switches to", async () => {
    render(<ThemeToggle />);

    const button = screen.getByRole("button", {
      name: "Switch to light theme",
    });
    await userEvent.setup().click(button);

    expect(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    ).toBeInTheDocument();
  });

  it("uses the Japanese accessible name in Japanese", () => {
    setLocale("ja");
    render(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: "ライトテーマに切り替える" }),
    ).toBeInTheDocument();

    setLocale("en");
  });

  it("names the light theme switch in Japanese after switching", async () => {
    setLocale("ja");
    setTheme("light");
    render(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: "ダークテーマに切り替える" }),
    ).toBeInTheDocument();

    setLocale("en");
  });

  afterEach(() => {
    setLocale("en");
    setTheme("dark");
  });
});
