import { describe, expect, it } from "vitest";

import {
  buildShareCardSvg,
  cardDimensions,
  escapeXml,
  fit,
  wrapText,
  type ShareCardAssets,
  type ShareCardContent,
} from "@/lib/share-cards/svg";

const FONTS = {
  heading: "data:font/woff2;base64,SEVBRElORw==",
  wordmarkMedium: "data:font/woff2;base64,TUVEVVVN",
  body: "data:font/woff2;base64,Qk9EWQ==",
  mono: null,
};

const noAssets: ShareCardAssets = {
  fonts: { heading: null, wordmarkMedium: null, body: null, mono: null },
  sprites: [],
};

const teamCard: ShareCardContent = {
  kind: "team",
  eyebrow: "Doubles · 6 Pokémon",
  heading: "Rain team",
  body: null,
  stat: null,
  species: ["Ludicolo", "Pelipper"],
};

describe("wrapText", () => {
  it("wraps Latin at spaces", () => {
    expect(wrapText("aaaa bbbb", 4.4, 10)).toEqual(["aaaa", "bbbb"]);
  });

  it("breaks a word longer than the line instead of overflowing", () => {
    const lines = wrapText("extraordinarily", 4, 10);
    for (const line of lines) {
      expect([...line].length).toBeLessThanOrEqual(8);
    }
    expect(lines.join("")).toContain("extraordinarily".slice(0, 8));
  });

  it("wraps Japanese anywhere, one character per em", () => {
    expect(wrapText("ダメージ計算ダメージ計算", 6, 10)).toEqual([
      "ダメージ計算",
      "ダメージ計算",
    ]);
  });

  it("clamps to maxLines with an ellipsis", () => {
    const lines = wrapText("one two three four five six", 4, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/…$/);
    expect(lines[1]).not.toContain("six");
  });

  it("collapses whitespace", () => {
    expect(wrapText("  a   b  ", 10, 10)).toEqual(["a b"]);
  });
});

describe("escapeXml and fit", () => {
  it("escapes XML characters", () => {
    expect(escapeXml(`A & <B> "C" 'D'`)).toBe(
      "A &amp; &lt;B&gt; &quot;C&quot; &apos;D&apos;",
    );
  });

  it("caps a line with an ellipsis character", () => {
    expect(fit("abcdefgh", 5)).toBe("abcd…");
    expect(fit("abc", 5)).toBe("abc");
  });
});

describe("buildShareCardSvg", () => {
  it("sizes each format exactly", () => {
    expect(cardDimensions("1080x1920")).toEqual({ width: 1080, height: 1920 });
    expect(cardDimensions("1200x630")).toEqual({ width: 1200, height: 630 });
    expect(buildShareCardSvg(teamCard, "1080x1920", noAssets)).toContain(
      'width="1080" height="1920"',
    );
    expect(buildShareCardSvg(teamCard, "1200x630", noAssets)).toContain(
      'width="1200" height="630"',
    );
  });

  it("carries the identity: dark tokens, logo, wordmark and the site footer", () => {
    const svg = buildShareCardSvg(teamCard, "1080x1920", noAssets);
    expect(svg).toContain('fill="#0B0D10"');
    // The split-O mark strokes in the lime accent (the card's dark theme).
    expect(svg).toContain('stroke="#C8F031"');
    expect(svg).toContain(">OHKO<");
    expect(svg).toContain(">Lab<");
    expect(svg).toContain("ohkolab.com");
  });

  it("renders the localized content and escapes it", () => {
    const tricky: ShareCardContent = {
      kind: "post",
      eyebrow: "Doubles",
      heading: `Rain <Dance> & "more"`,
      body: null,
      stat: "68 - 82%",
      species: [],
    };
    const svg = buildShareCardSvg(tricky, "1200x630", noAssets);
    expect(svg).toContain("Rain &lt;Dance&gt; &amp; &quot;more&quot;");
    expect(svg).toContain("68 - 82%");
    expect(svg).not.toContain("<Dance>");
  });

  it("renders Japanese text without changes", () => {
    const jaCard: ShareCardContent = {
      kind: "team",
      eyebrow: "ダブル · 6匹",
      heading: "雨パーティ",
      body: "トリックルーム対策の構築です。とても長い説明文でも折り返されます。",
      stat: null,
      species: [],
    };
    const svg = buildShareCardSvg(jaCard, "1080x1920", noAssets);
    expect(svg).toContain("雨パーティ");
    expect(svg).toContain("ダブル · 6匹");
    expect(svg).toContain("トリックルーム対策の構築です。");
  });

  it("embeds the fonts it was given and no @font-face without them", () => {
    const withFonts = buildShareCardSvg(teamCard, "1200x630", {
      fonts: FONTS,
      sprites: [],
    });
    expect(withFonts).toContain("@font-face");
    expect(withFonts).toContain("data:font/woff2;base64,SEVBRElORw==");
    expect(buildShareCardSvg(teamCard, "1200x630", noAssets)).not.toContain(
      "@font-face",
    );
  });

  it("embeds up to six sprites as images", () => {
    const sprites = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
      dataUri: `data:image/png;base64,${n}`,
      pixelated: true,
    }));
    const svg = buildShareCardSvg(teamCard, "1200x630", {
      fonts: FONTS,
      sprites,
    });
    expect(svg.match(/<image /g)).toHaveLength(6);
    expect(svg).not.toContain("data:image/png;base64,7");
    expect(svg).toContain("image-rendering:pixelated");
  });

  it("omits optional blocks that are empty", () => {
    const minimal: ShareCardContent = {
      kind: "calc",
      eyebrow: null,
      heading: "Garchomp vs Togekiss",
      body: null,
      stat: null,
      species: [],
    };
    const svg = buildShareCardSvg(minimal, "1200x630", noAssets);
    expect(svg).not.toContain("<image ");
    expect(svg).toContain("Garchomp vs Togekiss");
  });
});
