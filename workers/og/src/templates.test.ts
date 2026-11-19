import { describe, expect, it } from "vitest";

import { buildCardHtml } from "./templates";

describe("buildCardHtml", () => {
  it("renders the wordmark, heading, body and sprites", () => {
    const html = buildCardHtml({
      heading: "Sand Balance",
      body: "Garchomp · Rotom-Wash",
      spriteUrls: [
        "https://play.pokemonshowdown.com/sprites/gen5/garchomp.png",
      ],
    });
    expect(html).toContain(">OHKOLab<");
    expect(html).toContain(">Sand Balance<");
    expect(html).toContain(">Garchomp · Rotom-Wash<");
    expect(html).toContain(
      'src="https://play.pokemonshowdown.com/sprites/gen5/garchomp.png"',
    );
    expect(html).toContain("#0B0D10");
    expect(html).toContain("#C8F031");
  });

  it("escapes user content, so a name can never inject markup", () => {
    const html = buildCardHtml({
      heading: `Team "Mega" <img src=x onerror=alert(1)>`,
      body: `& <script>alert("x")</script>`,
      spriteUrls: [],
    });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("Team &quot;Mega&quot;");
  });

  it("caps long headings and bodies instead of overflowing the layout", () => {
    const html = buildCardHtml({
      heading: "x".repeat(200),
      body: "y".repeat(500),
      spriteUrls: [],
    });
    expect(html).not.toContain("x".repeat(61));
    expect(html).not.toContain("y".repeat(201));
  });

  it("shows at most six sprites", () => {
    const urls = Array.from(
      { length: 9 },
      (_, i) => `https://example.com/sprite-${i}.png`,
    );
    const html = buildCardHtml({
      heading: "Team",
      body: null,
      spriteUrls: urls,
    });
    expect(html.match(/<img /g)).toHaveLength(6);
    expect(html).toContain("sprite-5.png");
    expect(html).not.toContain("sprite-6.png");
  });

  it("renders without a body or sprites", () => {
    const html = buildCardHtml({
      heading: "OHKOLab",
      body: null,
      spriteUrls: [],
    });
    expect(html).toContain(">OHKOLab<");
    expect(html).not.toContain("margin-top:24px");
    expect(html).not.toContain("<img ");
  });
});
