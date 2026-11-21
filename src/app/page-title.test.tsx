import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import {
  canonicalForPath,
  descriptionForPath,
  titleForPath,
} from "@/app/page-title";
import { renderAt } from "@/app/test-utils";
import { setLocale } from "@/lib/i18n/locale";

afterEach(() => {
  document.title = "";
});

describe("titleForPath", () => {
  it("titles every route", () => {
    expect(titleForPath("/")).toBe("OHKOLab");
    expect(titleForPath("/calc")).toBe("Damage calculator · OHKOLab");
    expect(titleForPath("/teams")).toBe("Teams · OHKOLab");
    expect(titleForPath("/teams/abc123")).toBe("Team · OHKOLab");
    expect(titleForPath("/meta")).toBe("Metagame · OHKOLab");
    expect(titleForPath("/profile")).toBe("Profile · OHKOLab");
    expect(titleForPath("/notifications")).toBe("Notifications · OHKOLab");
    expect(titleForPath("/groups")).toBe("Groups · OHKOLab");
    expect(titleForPath("/groups/new")).toBe("Create a group · OHKOLab");
    expect(titleForPath("/g/test-group")).toBe("Group · OHKOLab");
    expect(titleForPath("/admin/reports")).toBe("Reports · OHKOLab");
    expect(titleForPath("/admin/appeals")).toBe("Appeals · OHKOLab");
    expect(titleForPath("/moderation/abc")).toBe("Moderation notice · OHKOLab");
    expect(titleForPath("/messages")).toBe("Messages · OHKOLab");
    expect(titleForPath("/messages/abc123")).toBe("Messages · OHKOLab");
    expect(titleForPath("/login")).toBe("Sign in · OHKOLab");
    expect(titleForPath("/auth/callback")).toBe("Signing in · OHKOLab");
    expect(titleForPath("/reset-password")).toBe("Reset password · OHKOLab");
    expect(titleForPath("/u/ashketchum")).toBe("ashketchum · OHKOLab");
    expect(titleForPath("/terms")).toBe("Terms · OHKOLab");
    expect(titleForPath("/privacy")).toBe("Privacy · OHKOLab");
    expect(titleForPath("/nope")).toBe("Page not found · OHKOLab");
  });
});

describe("usePageTitle", () => {
  it("sets the document title for the current route", () => {
    renderAt("/calc");
    expect(document.title).toBe("Damage calculator · OHKOLab");
  });

  it("updates the title when navigating", async () => {
    renderAt("/");
    expect(document.title).toBe("OHKOLab");

    const user = userEvent.setup();
    await user.click(screen.getAllByRole("link", { name: "Calc" })[0]!);
    expect(document.title).toBe("Damage calculator · OHKOLab");

    await user.click(screen.getAllByRole("link", { name: "Teams" })[0]!);
    expect(document.title).toBe("Teams · OHKOLab");
  });
});

describe("descriptionForPath", () => {
  it("describes every public route in English", () => {
    expect(descriptionForPath("/")).toBe(
      "Damage calculator, team builder and community for Pokémon Champions. Unofficial fan project.",
    );
    expect(descriptionForPath("/calc")).toBe(
      "Calculate damage between Pokémon Champions sets, with items, weather, terrains and Doubles and Singles support.",
    );
    expect(descriptionForPath("/teams")).toBe(
      "Build, save and analyse your Pokémon Champions teams.",
    );
    expect(descriptionForPath("/teams/abc123")).toBe(
      "A Pokémon Champions team shared on OHKOLab.",
    );
    expect(descriptionForPath("/meta")).toContain("usage statistics");
    expect(descriptionForPath("/post/abc")).toBe(
      "A post from the OHKOLab Pokémon Champions community.",
    );
    expect(descriptionForPath("/u/ashketchum")).toBe(
      "A player's posts, shared teams and groups on OHKOLab.",
    );
    expect(descriptionForPath("/groups")).toContain("groups");
    expect(descriptionForPath("/g/slug")).toContain("group");
    expect(descriptionForPath("/terms")).toContain("terms of use");
    expect(descriptionForPath("/messages")).toContain("Direct messages");
    expect(descriptionForPath("/messages/abc")).toContain("Direct messages");
    expect(descriptionForPath("/privacy")).toContain("privacy");
    // Routes without their own description keep the site default.
    expect(descriptionForPath("/login")).toBe(descriptionForPath("/"));
    expect(descriptionForPath("/nope")).toBe(descriptionForPath("/"));
  });

  it("describes the routes in Japanese in that locale", () => {
    setLocale("ja");
    try {
      expect(descriptionForPath("/")).toContain("ダメージ計算");
      expect(descriptionForPath("/calc")).toContain("ダメージ計算");
      expect(descriptionForPath("/teams/abc")).toContain("構築");
      expect(descriptionForPath("/u/ashketchum")).toContain("プレイヤー");
    } finally {
      setLocale("en");
    }
  });
});

describe("canonicalForPath", () => {
  it("builds the canonical URL of a route", () => {
    expect(canonicalForPath("/")).toBe("https://ohkolab.com/");
    expect(canonicalForPath("/calc")).toBe("https://ohkolab.com/calc");
    expect(canonicalForPath("/u/ashketchum")).toBe(
      "https://ohkolab.com/u/ashketchum",
    );
  });
});

describe("usePageTitle meta tags", () => {
  afterEach(() => {
    document.querySelector('meta[name="description"]')?.remove();
    document.querySelector('link[rel="canonical"]')?.remove();
  });

  function metaDescription(): string | null {
    return (
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") ?? null
    );
  }

  function canonical(): string | null {
    return (
      document.querySelector('link[rel="canonical"]')?.getAttribute("href") ??
      null
    );
  }

  it("sets the description and canonical link per route", () => {
    renderAt("/calc");

    expect(metaDescription()).toBe(
      "Calculate damage between Pokémon Champions sets, with items, weather, terrains and Doubles and Singles support.",
    );
    expect(canonical()).toBe("https://ohkolab.com/calc");
  });

  it("updates the description and canonical on client-side navigation", async () => {
    renderAt("/");

    const user = userEvent.setup();
    await user.click(screen.getAllByRole("link", { name: "Calc" })[0]!);

    expect(canonical()).toBe("https://ohkolab.com/calc");
    expect(metaDescription()).toContain("Calculate damage");

    await user.click(screen.getAllByRole("link", { name: "Teams" })[0]!);

    expect(canonical()).toBe("https://ohkolab.com/teams");
    expect(metaDescription()).toBe(
      "Build, save and analyse your Pokémon Champions teams.",
    );
  });

  it("re-renders the description in Japanese after a locale switch", async () => {
    renderAt("/calc");
    expect(metaDescription()).toContain("Calculate damage");

    setLocale("ja");
    try {
      // The hook re-runs once the Japanese dictionary chunk lands.
      await waitFor(() => expect(metaDescription()).toContain("ダメージ計算"));
      expect(canonical()).toBe("https://ohkolab.com/calc");
    } finally {
      setLocale("en");
    }
  });
});
