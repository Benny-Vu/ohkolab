import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { LearnPage } from "@/features/learn/learn-page";
import { registerEnglishDomain } from "@/lib/i18n/en-loader";
import { learnEn } from "@/lib/i18n/entries/learn";
import { setLocale } from "@/lib/i18n/locale";

/**
 * The /learn explainers: the four load-bearing anchors, the live damage
 * example, the Japanese render, and the hash scroll other pages rely on
 * when they link to an anchor. The learn dictionary registers here (like
 * the battles domain does in its own tests); the setup file loads the
 * Japanese dictionary.
 */

registerEnglishDomain("learn", learnEn);

function renderLearn(initialEntry = "/learn") {
  const router = createMemoryRouter(
    [{ path: "/learn", element: <LearnPage /> }],
    { initialEntries: [initialEntry] },
  );
  return render(<RouterProvider router={router} />);
}

describe("LearnPage", () => {
  it("renders the four explainers with their linkable anchors", () => {
    renderLearn();

    for (const heading of [
      "Learn",
      "Damage rolls",
      "OHKO and 2HKO",
      "Stat Points (SP)",
      "Speed ties",
    ]) {
      // ByRole name strings match the full accessible name, so "Learn"
      // does not match "Learn something" and needs no extra flag.
      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
    }
    // The anchors the calc links to; the 2hko spelling shares the OHKO card.
    for (const id of [
      "damage-rolls",
      "ohko",
      "2hko",
      "stat-points",
      "speed-ties",
    ]) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("shows a live damage range from the sample calculation", () => {
    renderLearn();

    // Real numbers from @/data: min < max, as percentages of max HP.
    const line = screen.getByText(
      /^Earthquake from Garchomp into Incineroar: \d+–\d+ damage \(\d+(?:\.\d+)?–\d+(?:\.\d+)?% of its max HP\)\.$/,
    );
    expect(line).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /HP left after the hit: \d+ to \d+ percent/,
      }),
    ).toBeInTheDocument();
  });

  it("scrolls to the linked section once the page has mounted", async () => {
    const scrollSpy = vi.spyOn(Element.prototype, "scrollIntoView");
    try {
      renderLearn("/learn#ohko");

      await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
      expect(scrollSpy.mock.contexts.at(-1)).toBe(
        document.getElementById("ohko"),
      );
    } finally {
      scrollSpy.mockRestore();
    }
  });

  it("renders in Japanese", () => {
    setLocale("ja");
    try {
      renderLearn();

      expect(
        screen.getByRole("heading", { name: "はじめに" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "ダメージの乱数" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "OHKOと2HKO" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "ステータスポイント（SP）" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "同速" })).toBeInTheDocument();
      expect(screen.getByText(/ダメージ（最大HPの/)).toBeInTheDocument();
    } finally {
      setLocale("en");
    }
  });
});
