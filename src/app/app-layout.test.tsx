import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NAV_ITEMS } from "@/app/nav-items";
import { t } from "@/lib/i18n/t";
import { createSignedInAuth, renderAt } from "@/app/test-utils";

describe("AppLayout", () => {
  it("shows every destination in the header navigation and marks the current one", () => {
    renderAt("/calc");
    expect(screen.getByText("calc content")).toBeInTheDocument();

    const navs = screen.getAllByRole("navigation", { name: "Main" });
    expect(navs).toHaveLength(2);
    const header = navs[0]!;
    for (const item of NAV_ITEMS.filter((item) => item.to !== "/profile")) {
      expect(
        within(header).getByRole("link", { name: t(item.labelKey) }),
      ).toHaveAttribute("href", item.to);
    }
    expect(
      within(header).queryByRole("link", { name: "Profile" }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: "Notifications",
      }),
    ).toHaveAttribute("href", "/notifications");
    expect(within(header).getByRole("link", { name: "Calc" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(header).getByRole("link", { name: "Home" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("shows the tab bar destinations with a sign-in entry for guests", () => {
    renderAt("/calc");

    const tabNav = screen.getAllByRole("navigation", { name: "Main" })[1]!;
    for (const item of NAV_ITEMS.filter((item) => item.to !== "/profile")) {
      expect(
        within(tabNav).getByRole("link", { name: t(item.labelKey) }),
      ).toHaveAttribute("href", item.to);
    }
    expect(
      within(tabNav).queryByRole("link", { name: "Profile" }),
    ).not.toBeInTheDocument();
    expect(
      within(tabNav).getByRole("link", { name: "Sign in" }),
    ).toHaveAttribute("href", "/login");
    expect(within(tabNav).getByRole("link", { name: "Calc" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("labels the profile tab 'Profile' and shows the user's avatar when signed in", () => {
    renderAt("/calc", createSignedInAuth());

    const tabNav = screen.getAllByRole("navigation", { name: "Main" })[1]!;
    const tabTrigger = within(tabNav).getByRole("button", {
      name: "Account menu",
    });
    expect(tabTrigger).toHaveTextContent("Profile");
    expect(
      within(tabTrigger).getByRole("img", { name: "Pikachu" }),
    ).toBeInTheDocument();
  });

  it("shows the fan-project line and legal links in the footer", () => {
    renderAt("/");
    expect(
      screen.getByText(
        "OHKOLab is an unofficial fan project, not affiliated with Nintendo, Game Freak, Creatures or The Pokémon Company.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("shows the not-found page for unknown addresses", () => {
    renderAt("/nope");
    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
  });
});
