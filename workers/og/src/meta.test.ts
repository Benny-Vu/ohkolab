import { describe, expect, it } from "vitest";

import type { OgCard } from "./cards";
import {
  buildPreviewDocument,
  buildPreviewTags,
  escapeHtml,
  injectPreview,
  stripPreviewTags,
} from "./meta";

const card: OgCard = {
  title: "Benny's Team",
  description: "Garchomp, Rotom-Wash",
  imageUrl: "https://ohkolab.com/og/team/abc.png",
  url: "https://ohkolab.com/teams/abc",
};

describe("escapeHtml", () => {
  it("escapes the attribute-breaking characters", () => {
    expect(escapeHtml(`a"b`)).toBe("a&quot;b");
    expect(escapeHtml("a<b")).toBe("a&lt;b");
    expect(escapeHtml("a>b")).toBe("a&gt;b");
    expect(escapeHtml("a&b")).toBe("a&amp;b");
    expect(escapeHtml("a'b")).toBe("a&#39;b");
  });

  it("escapes ampersands first, so nothing is double-escaped", () => {
    expect(escapeHtml("&quot;")).toBe("&amp;quot;");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("neutralizes full injection attempts", () => {
    const hostile = `"><script>alert("xss")</script>`;
    const escaped = escapeHtml(hostile);
    expect(escaped).not.toContain(`"`);
    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain(">");
    expect(escaped).toBe(
      "&quot;&gt;&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
  });

  it("leaves plain text alone", () => {
    expect(escapeHtml("Garchomp — level 50")).toBe("Garchomp — level 50");
  });
});

describe("buildPreviewTags", () => {
  it("contains the full Open Graph and Twitter Card sets", () => {
    const tags = buildPreviewTags(card);
    expect(tags).toContain(
      '<meta property="og:title" content="Benny&#39;s Team" />',
    );
    expect(tags).toContain(
      '<meta property="og:description" content="Garchomp, Rotom-Wash" />',
    );
    expect(tags).toContain(
      '<meta property="og:image" content="https://ohkolab.com/og/team/abc.png" />',
    );
    expect(tags).toContain(
      '<meta property="og:url" content="https://ohkolab.com/teams/abc" />',
    );
    expect(tags).toContain('<meta property="og:type" content="website" />');
    expect(tags).toContain(
      '<meta property="og:site_name" content="OHKOLab" />',
    );
    expect(tags).toContain(
      '<meta name="twitter:card" content="summary_large_image" />',
    );
    expect(tags).toContain(
      '<meta name="twitter:title" content="Benny&#39;s Team" />',
    );
    expect(tags).toContain(
      '<meta name="twitter:description" content="Garchomp, Rotom-Wash" />',
    );
    expect(tags).toContain(
      '<meta name="twitter:image" content="https://ohkolab.com/og/team/abc.png" />',
    );
  });

  it("sets the title, description and canonical too", () => {
    const tags = buildPreviewTags(card);
    expect(tags).toContain("<title>Benny&#39;s Team</title>");
    expect(tags).toContain(
      '<meta name="description" content="Garchomp, Rotom-Wash" />',
    );
    expect(tags).toContain(
      '<link rel="canonical" href="https://ohkolab.com/teams/abc" />',
    );
  });

  it("escapes database content, so quotes can never break out of an attribute", () => {
    const hostile: OgCard = {
      title: `Team "Mega" & <friends>`,
      description: `bio with "quotes" & <b>tags</b>`,
      imageUrl: "https://ohkolab.com/og/brand/ohkolab.png",
      url: "https://ohkolab.com/",
    };
    const tags = buildPreviewTags(hostile);
    // The raw text never appears; only its escaped form.
    expect(tags).not.toContain(`"Mega"`);
    expect(tags).not.toContain("<b>");
    expect(tags).not.toContain("<friends>");
    expect(tags).toContain("Team &quot;Mega&quot; &amp; &lt;friends&gt;");
    // No attribute can be closed early: no unescaped quote remains inside
    // any content attribute.
    for (const match of tags.matchAll(/content="([^"]*)"/g)) {
      expect(match[1]).not.toContain('"');
    }
  });
});

const INDEX_HTML = `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Damage calculator, team builder and community for Pokémon Champions. Unofficial fan project." />
    <meta name="theme-color" content="#0b0d14" />
    <link rel="canonical" href="https://ohkolab.com/" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta property="og:title" content="OHKOLab" />
    <meta property="og:description" content="Damage calculator, team builder and community for Pokémon Champions. Unofficial fan project." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://ohkolab.com/" />
    <meta property="og:site_name" content="OHKOLab" />
    <meta property="og:image" content="https://ohkolab.com/favicon.svg" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="OHKOLab" />
    <meta name="twitter:description" content="Damage calculator, team builder and community for Pokémon Champions. Unofficial fan project." />
    <title>OHKOLab</title>
    <script>
      try { localStorage.getItem("ohkolab:theme"); } catch {}
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

describe("stripPreviewTags", () => {
  it("removes the shipped preview tags but nothing else", () => {
    const stripped = stripPreviewTags(INDEX_HTML);
    expect(stripped).not.toContain("og:");
    expect(stripped).not.toContain("twitter:");
    expect(stripped).not.toContain('name="description"');
    expect(stripped).not.toContain("canonical");
    expect(stripped).not.toContain("<title>");
    // The parts that must survive: charset, viewport, icon, manifest,
    // theme-color, the script and the body.
    expect(stripped).toContain('charset="UTF-8"');
    expect(stripped).toContain('name="viewport"');
    expect(stripped).toContain("favicon.svg");
    expect(stripped).toContain("manifest.webmanifest");
    expect(stripped).toContain('name="theme-color"');
    expect(stripped).toContain("localStorage.getItem");
    expect(stripped).toContain('<div id="root"></div>');
  });

  it("handles quoting styles, attribute order and casing", () => {
    const variant = `
      <meta property='og:title' content='x' />
      <meta content="y" name="twitter:description" />
      <META PROPERTY="OG:IMAGE" CONTENT="z" />
      <link href="https://ohkolab.com/" rel="canonical" />
      <Title>Old</Title>
    `;
    const stripped = stripPreviewTags(variant);
    expect(stripped).not.toContain("og:title");
    expect(stripped).not.toContain("twitter:description");
    expect(stripped).not.toContain("OG:IMAGE");
    expect(stripped).not.toContain("canonical");
    expect(stripped).not.toContain("Old");
  });

  it("leaves other meta tags in alternate HTML alone", () => {
    const other = `<meta name="theme-color" content="#0b0d14" />`;
    expect(stripPreviewTags(other)).toBe(other);
  });
});

describe("injectPreview", () => {
  it("replaces the home page's tags with the page's card, before </head>", () => {
    const html = injectPreview(INDEX_HTML, card);
    expect(html).toContain(
      '<meta property="og:title" content="Benny&#39;s Team" />',
    );
    expect(html).toContain("<title>Benny&#39;s Team</title>");
    // Each preview tag appears exactly once: no shipped leftovers.
    expect(html.match(/og:title/g)).toHaveLength(1);
    expect(html.match(/twitter:card/g)).toHaveLength(1);
    expect(html.match(/canonical/g)).toHaveLength(1);
    expect(html.match(/<title>/g)).toHaveLength(1);
    // Injected before </head>, after the last shipped tag.
    const injectAt = html.indexOf('<meta property="og:title"');
    expect(injectAt).toBeGreaterThan(-1);
    expect(injectAt).toBeLessThan(html.indexOf("</head>"));
    // The rest of the document is untouched.
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain("localStorage.getItem");
  });

  it("appends the tags when no </head> exists", () => {
    const html = injectPreview("<html><body></body></html>", card);
    expect(html).toContain(
      '<meta property="og:title" content="Benny&#39;s Team" />',
    );
    expect(html).toContain("<html><body></body></html>");
  });

  it("never lets card content break out of the document structure", () => {
    const hostile: OgCard = {
      title: "</title><script>alert(1)</script>",
      description: `"/></head><meta name="injected" content="yes" />`,
      imageUrl: "https://ohkolab.com/og/brand/ohkolab.png",
      url: "https://ohkolab.com/",
    };
    const html = injectPreview(INDEX_HTML, hostile);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain('name="injected"');
  });
});

describe("buildPreviewDocument", () => {
  it("wraps the tags in a minimal HTML document", () => {
    const document = buildPreviewDocument(card);
    expect(document).toContain("<!doctype html>");
    expect(document).toContain(
      '<meta property="og:title" content="Benny&#39;s Team" />',
    );
    expect(document).toContain("</head>");
  });
});
