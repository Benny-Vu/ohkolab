import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { learnRoutes } from "@/features/learn/routes";
import { PageLoading } from "@/app/route-pages";
import { registerEnglishDomain } from "@/lib/i18n/en-loader";
import { learnEn } from "@/lib/i18n/entries/learn";
import { setLocale } from "@/lib/i18n/locale";

/**
 * The learn pages: the hub and its section cards, the old-anchor
 * forwarding, a guide page with its pager, the glossary search, and the
 * Japanese render. The learn dictionary registers here (like the battles
 * domain does in its own tests); the setup file loads the Japanese
 * dictionary. The routes lazy-load, so every first query awaits.
 */

registerEnglishDomain("learn", learnEn);

function renderLearn(initialEntry = "/learn") {
  const router = createMemoryRouter(
    [{ path: "/", children: [...learnRoutes] }],
    {
      initialEntries: [initialEntry],
      hydrateFallbackElement: <PageLoading />,
    },
  );
  return render(<RouterProvider router={router} />);
}

describe("the learn hub", () => {
  it("renders one card per section with its entry count", async () => {
    renderLearn("/learn");

    expect(
      await screen.findByRole("heading", { name: "Learn", level: 1 }),
    ).toBeInTheDocument();
    const expectedHrefs: Record<string, string> = {
      Vocabulary: "/learn/vocabulary",
      Concepts: "/learn/concepts",
      Types: "/learn/types",
      "Field conditions": "/learn/field",
    };
    for (const [name, href] of Object.entries(expectedHrefs)) {
      expect(
        screen.getByRole("link", { name: new RegExp(name) }),
      ).toHaveAttribute("href", href);
    }
  });

  it("forwards the old calc anchors to the guide pages", async () => {
    renderLearn("/learn#ohko");
    expect(
      await screen.findByRole("heading", {
        name: "OHKO and 2HKO",
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it("forwards the 2hko spelling to the same guide", async () => {
    renderLearn("/learn#2hko");
    expect(
      await screen.findByRole("heading", {
        name: "OHKO and 2HKO",
        level: 1,
      }),
    ).toBeInTheDocument();
  });
});

describe("a guide page", () => {
  it("shows the breadcrumb, body, live example and calc link", async () => {
    renderLearn("/learn/damage-rolls");

    expect(
      await screen.findByRole("heading", {
        name: "Damage rolls",
        level: 1,
      }),
    ).toBeInTheDocument();
    // Breadcrumb: hub and section. The tab row repeats the section link,
    // so the breadcrumb is asserted by href, not by unique name.
    expect(screen.getByRole("link", { name: "Learn" })).toHaveAttribute(
      "href",
      "/learn",
    );
    const sectionLinks = screen
      .getAllByRole("link", { name: "Concepts" })
      .map((link) => link.getAttribute("href"));
    expect(sectionLinks).toContain("/learn/concepts");

    // The live example: real numbers from @/data.
    expect(
      screen.getByText(
        /^Earthquake from Garchomp into Incineroar: \d+–\d+ damage \(\d+(?:\.\d+)?–\d+(?:\.\d+)?% of its max HP\)\.$/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Try it in the calc" }),
    ).toHaveAttribute("href", "/calc");
  });

  it("links previous and next within the section", async () => {
    renderLearn("/learn/stat-points");

    expect(
      await screen.findByRole("link", {
        name: "Previous guide: OHKO and 2HKO",
      }),
    ).toHaveAttribute("href", "/learn/ohko");
    expect(
      screen.getByRole("link", { name: "Next guide: Speed ties" }),
    ).toHaveAttribute("href", "/learn/speed-ties");
  });

  it("answers unknown slugs with the not-found page", async () => {
    renderLearn("/learn/nope");
    expect(
      await screen.findByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
  });

  it("renders in Japanese", async () => {
    setLocale("ja");
    try {
      renderLearn("/learn/damage-rolls");
      expect(
        await screen.findByRole("heading", {
          name: "ダメージの乱数",
          level: 1,
        }),
      ).toBeInTheDocument();
      expect(screen.getByText(/ダメージ（最大HPの/)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "計算機で試す" }),
      ).toHaveAttribute("href", "/calc");
    } finally {
      setLocale("en");
    }
  });
});

describe("the concepts section page", () => {
  it("lists the long guides as summary rows with Read", async () => {
    renderLearn("/learn/concepts");

    expect(
      await screen.findByRole("heading", { name: "Concepts", level: 1 }),
    ).toBeInTheDocument();
    // The sidebar repeats the guide titles as links, so assert by href.
    const damageRollsLinks = screen
      .getAllByRole("link", { name: /Damage rolls/ })
      .map((link) => link.getAttribute("href"));
    expect(damageRollsLinks).toContain("/learn/damage-rolls");
    // The summary rows say "Read" (one per long entry), the sidebar
    // links do not.
    expect(screen.getAllByText("Read")).toHaveLength(4);
  });
});

describe("the vocabulary page", () => {
  it("opens a term in place on phones", async () => {
    const user = userEvent.setup();
    renderLearn("/learn/vocabulary");

    // jsdom matches nothing, so the phone layout renders: a toggle row.
    const row = await screen.findByRole("button", { name: "STAB" });
    expect(row).toHaveAttribute("aria-expanded", "false");
    await user.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/damage bonus/)).toBeVisible();
  });

  it("opens the deep-linked term", async () => {
    const scrollSpy = vi.spyOn(Element.prototype, "scrollIntoView");
    try {
      renderLearn("/learn/vocabulary#stab");
      expect(
        await screen.findByRole("heading", { name: "Vocabulary", level: 1 }),
      ).toBeInTheDocument();
      const row = screen.getByRole("button", { name: "STAB" });
      expect(row).toHaveAttribute("aria-expanded", "true");
      await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
    } finally {
      scrollSpy.mockRestore();
    }
  });

  it("filters the terms as you type", async () => {
    const user = userEvent.setup();
    renderLearn("/learn/vocabulary");

    expect(
      await screen.findByRole("button", { name: "STAB" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fake Out" }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("searchbox", { name: "Search terms" }),
      "stab",
    );
    expect(screen.getByRole("button", { name: "STAB" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Fake Out" }),
    ).not.toBeInTheDocument();
  });
});
