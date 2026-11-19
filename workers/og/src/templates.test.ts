import { describe, expect, it } from "vitest";

import { buildCardElement, type CardNode } from "./templates";

/** All text of a tree, in document order. */
function treeText(node: CardNode): string {
  const children = node.props.children ?? [];
  if (typeof children === "string") return children;
  return children
    .map((child) =>
      typeof child === "string" ? child : treeText(child as CardNode),
    )
    .join(" ");
}

/** All img src values of a tree. */
function treeImages(node: CardNode): string[] {
  if (node.type === "img" && typeof node.props.src === "string") {
    return [node.props.src];
  }
  const children = node.props.children ?? [];
  if (typeof children === "string") return [];
  return children.flatMap((child) =>
    typeof child === "string" ? [] : treeImages(child as CardNode),
  );
}

describe("buildCardElement", () => {
  it("renders the wordmark, heading, body and sprites", () => {
    const tree = buildCardElement({
      heading: "Sand Balance",
      body: "Garchomp · Rotom-Wash",
      spriteUrls: [
        "https://play.pokemonshowdown.com/sprites/gen5/garchomp.png",
      ],
    });
    const flat = treeText(tree);
    expect(flat).toContain("OHKOLab");
    expect(flat).toContain("Sand Balance");
    expect(flat).toContain("Garchomp · Rotom-Wash");
    expect(treeImages(tree)).toEqual([
      "https://play.pokemonshowdown.com/sprites/gen5/garchomp.png",
    ]);
    expect(JSON.stringify(tree)).toContain("#0B0D10");
    expect(JSON.stringify(tree)).toContain("#C8F031");
  });

  it("keeps user content as text data, never markup", () => {
    const tree = buildCardElement({
      heading: `Team "Mega" <img src=x onerror=alert(1)>`,
      body: `& <script>alert("x")</script>`,
      spriteUrls: [],
    });
    // The heading survives as plain text in one string node...
    expect(treeText(tree)).toContain(
      'Team "Mega" <img src=x onerror=alert(1)>',
    );
    // ...and no img element other than sprites exists anywhere.
    expect(treeImages(tree)).toEqual([]);
  });

  it("caps long headings and bodies instead of overflowing the layout", () => {
    const tree = buildCardElement({
      heading: "x".repeat(200),
      body: "y".repeat(500),
      spriteUrls: [],
    });
    expect(treeText(tree)).not.toContain("x".repeat(61));
    expect(treeText(tree)).not.toContain("y".repeat(201));
  });

  it("shows at most six sprites", () => {
    const urls = Array.from(
      { length: 9 },
      (_, i) => `https://example.com/sprite-${i}.png`,
    );
    const tree = buildCardElement({
      heading: "Team",
      body: null,
      spriteUrls: urls,
    });
    expect(treeImages(tree)).toHaveLength(6);
    expect(treeImages(tree)[5]).toContain("sprite-5.png");
    expect(treeImages(tree)).not.toContain("https://example.com/sprite-6.png");
  });

  it("renders without a body or sprites", () => {
    const tree = buildCardElement({
      heading: "OHKOLab",
      body: null,
      spriteUrls: [],
    });
    expect(treeText(tree)).toContain("OHKOLab");
    expect(treeImages(tree)).toEqual([]);
    // No body line: only the wordmark and the heading remain.
    expect(JSON.stringify(tree)).not.toContain('lineHeight":"1.4');
    expect(JSON.stringify(tree)).not.toContain('marginTop":"40px');
  });

  it("gives every div with array children an explicit flex display (satori requirement)", () => {
    function check(node: CardNode): void {
      const children = node.props.children ?? [];
      if (
        node.type === "div" &&
        Array.isArray(children) &&
        children.length > 0
      ) {
        expect(node.props.style?.display, `div with array children`).toBe(
          "flex",
        );
        for (const child of children) {
          if (typeof child !== "string") check(child as CardNode);
        }
      }
    }
    check(
      buildCardElement({
        heading: "Full card",
        body: "with a body",
        spriteUrls: ["https://example.com/a.png"],
      }),
    );
  });
});
