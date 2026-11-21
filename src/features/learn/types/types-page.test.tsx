import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";

import { typeEffectiveness } from "@/data/type-chart";
import { learnRoutes } from "@/features/learn/routes";
import { registerEnglishDomain } from "@/lib/i18n/en-loader";
import { learnEn } from "@/lib/i18n/entries/learn";
import { setLocale } from "@/lib/i18n/locale";
import { TYPE_NAMES, type TypeName } from "@/types/pokemon";

/**
 * The Types page in the jsdom phone default: 18 toggle rows that open
 * into their cards, rows derived from `@/data`'s chart functions, empty
 * rows left out, traits only where verified, and the 18×18 chart with
 * every cell checked against `typeEffectiveness`. Assertion-based only —
 * no screenshots.
 */

registerEnglishDomain("learn", learnEn);

function renderTypes(initialEntry = "/learn/types") {
  const router = createMemoryRouter(
    [{ path: "/", children: [...learnRoutes] }],
    { initialEntries: [initialEntry] },
  );
  return render(<RouterProvider router={router} />);
}

/**
 * The phone row of one type. The toggle's aria-label is the type's
 * display name, so the badge text is not heard twice.
 */
function typeRow(type: TypeName) {
  return screen.getByRole("button", { name: type });
}

describe("the types page", () => {
  it("renders one toggle row per type, all closed", async () => {
    renderTypes();

    expect(
      await screen.findByRole("heading", { name: "Types", level: 1 }),
    ).toBeInTheDocument();
    for (const type of TYPE_NAMES) {
      const row = typeRow(type);
      expect(row).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("lists the 18 types and the chart in the sidebar, as anchors", async () => {
    renderTypes();

    await screen.findByRole("heading", { name: "Types", level: 1 });
    const anchors = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href") ?? "")
      .filter((href) => href.startsWith("/learn/types#"));
    expect(anchors).toHaveLength(19);
    for (const type of TYPE_NAMES) {
      expect(anchors).toContain(`/learn/types#${type.toLowerCase()}`);
    }
    expect(anchors).toContain("/learn/types#type-chart");
  });

  it("opens a type into its card with rows derived from @/data", async () => {
    const user = userEvent.setup();
    renderTypes();

    const row = await screen.findByRole("button", { name: "Fire" });
    await user.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");

    const card = document.getElementById("fire");
    expect(card).not.toBeNull();
    const inCard = within(card!);

    // Attacking: Fire hits Grass, Bug, Ice and Steel for ×2.
    const defending: TypeName[] = ["Grass", "Bug", "Ice", "Steel"];
    for (const type of defending) {
      expect(typeEffectiveness("Fire", [type])).toBeGreaterThanOrEqual(2);
    }
    expect(inCard.getByText("Super effective against")).toBeInTheDocument();
    for (const type of defending) {
      expect(inCard.getAllByText(type).length).toBeGreaterThan(0);
    }
    // Fire is resisted but never fully blocked: no "No effect on" row.
    expect(inCard.queryByText("No effect on")).not.toBeInTheDocument();
    expect(inCard.queryByText(/^None$/)).not.toBeInTheDocument();
  });

  it("leaves a defender's empty rows out instead of showing None", async () => {
    const user = userEvent.setup();
    renderTypes();

    // Normal: weak to Fighting, resists nothing.
    const normal = await screen.findByRole("button", { name: "Normal" });
    await user.click(normal);
    const normalCard = within(document.getElementById("normal")!);
    expect(normalCard.getByText("Weak to")).toBeInTheDocument();
    expect(normalCard.getAllByText("Fighting").length).toBeGreaterThan(0);
    expect(normalCard.queryByText("Resists")).not.toBeInTheDocument();

    // Water: nothing is immune to it, and it is immune to nothing.
    const water = screen.getByRole("button", { name: "Water" });
    await user.click(water);
    const waterCard = within(document.getElementById("water")!);
    expect(waterCard.queryByText("No effect on")).not.toBeInTheDocument();
    expect(waterCard.queryByText("Immune to")).not.toBeInTheDocument();
  });

  it("shows traits only for the types that have verified ones", async () => {
    const user = userEvent.setup();
    renderTypes();

    const ice = await screen.findByRole("button", { name: "Ice" });
    await user.click(ice);
    const iceCard = within(document.getElementById("ice")!);
    expect(iceCard.getByText("Traits")).toBeInTheDocument();
    expect(iceCard.getByText(/Sheer Cold/)).toBeInTheDocument();

    const fire = screen.getByRole("button", { name: "Fire" });
    await user.click(fire);
    const fireCard = within(document.getElementById("fire")!);
    expect(fireCard.getByText("Can't be burned.")).toBeInTheDocument();

    // A type with no traits renders no Traits section at all.
    const water = screen.getByRole("button", { name: "Water" });
    await user.click(water);
    const waterCard = within(document.getElementById("water")!);
    expect(waterCard.queryByText("Traits")).not.toBeInTheDocument();
  });

  it("renders the chart: 18 attackers, 18 defenders, every cell from @/data", async () => {
    renderTypes();

    expect(
      await screen.findByRole("heading", { name: "Type chart", level: 2 }),
    ).toBeInTheDocument();
    const table = screen.getByRole("table");
    // 1 header row + 18 attacker rows; 18 defender columns (the corner
    // cell is aria-hidden); 18 attacker row headers.
    expect(within(table).getAllByRole("row")).toHaveLength(19);
    expect(within(table).getAllByRole("columnheader")).toHaveLength(18);
    const rowHeaders = within(table).getAllByRole("rowheader");
    expect(rowHeaders).toHaveLength(18);
    expect(rowHeaders.map((header) => header.textContent)).toEqual(
      TYPE_NAMES.map((type) => type.slice(0, 3).toUpperCase()),
    );

    // Every cell matches typeEffectiveness, in text and in cell class.
    const cellClass: Record<number, string> = {
      2: "bg-success/15",
      0.5: "bg-destructive/15",
      0: "border",
    };
    const bodyRows = within(table).getAllByRole("row").slice(1);
    expect(bodyRows).toHaveLength(18);
    for (const [rowIndex, row] of bodyRows.entries()) {
      // The rows render in TYPE_NAMES order; the headers show codes.
      const attacking = TYPE_NAMES[rowIndex];
      if (!attacking) throw new Error("missing attacking type");
      const cells = within(row).getAllByRole("cell");
      expect(cells).toHaveLength(18);
      for (const [index, cell] of cells.entries()) {
        const defending = TYPE_NAMES[index];
        if (!defending) throw new Error("missing defending type");
        const multiplier = typeEffectiveness(attacking, [defending]);
        const span = cell.querySelector("span");
        if (multiplier === 1) {
          expect(span?.textContent).toBe("");
        } else {
          expect(span?.textContent).toBe(
            multiplier === 2 ? "2" : multiplier === 0.5 ? "½" : "0",
          );
          expect(span?.className).toContain(cellClass[multiplier]);
        }
      }
    }
  });

  it("renders in Japanese, chart and all", async () => {
    setLocale("ja");
    try {
      renderTypes();
      expect(
        await screen.findByRole("heading", { name: "タイプ相性表", level: 2 }),
      ).toBeInTheDocument();
      expect(screen.getByText("行は攻撃側、列は防御側。")).toBeInTheDocument();
      // The Japanese display names load as their own chunk.
      expect(
        await screen.findByRole("button", { name: "ほのお" }),
      ).toBeInTheDocument();
    } finally {
      setLocale("en");
    }
  });
});
