/**
 * Share-card composition: the pure half of "Save as image".
 *
 * Everything here is string building — no DOM, no canvas — so the card can be
 * tested headlessly and reused by any renderer. The rasterize-and-download
 * half lives in `save.ts`; the fonts and sprites that get embedded as data
 * URIs are fetched in `assets.ts`.
 *
 * The design is the app's dark theme and logo geometry (the same fixed
 * colours as `public/favicon.svg` and the OG Worker's `BRAND` palette): page
 * #0B0D10, hairline #252A32, foreground #F2F4F7, muted #98A1AD and the lime
 * accent #C8F031. The card is always rendered in the dark identity colours,
 * not the viewer's theme, so a shared card looks the same everywhere.
 */

/** The two output formats, as the telemetry event names them. */
export type ShareCardFormat = "1080x1920" | "1200x630";

/** Which surface the card was saved from. */
type ShareCardKind = "team" | "calc" | "post";

/** What the card shows. Localized by the call site; this module never translates. */
export interface ShareCardContent {
  kind: ShareCardKind;
  /** The small muted line above the heading, e.g. "Doubles · 6 Pokémon". */
  eyebrow: string | null;
  /** The main line: a team name, an attacker-vs-defender line, a post body. */
  heading: string;
  /** A secondary line in the body font (the move name on a calc card). */
  body: string | null;
  /** One monospace line, e.g. the damage range "68 - 82%". */
  stat: string | null;
  /** Species names for the sprite row, in display order; may be empty. */
  species: string[];
}

/** An embedded font, as a `data:` URI; null keeps the family's fallbacks. */
type EmbeddedFont = string | null;

/** The fonts a card can embed (fetched once and cached by `assets.ts`). */
export interface ShareCardFonts {
  /** Barlow Semi Condensed 700 — the heading/wordmark weight. */
  heading: EmbeddedFont;
  /** Barlow Semi Condensed 500 — the wordmark's "Lab". */
  wordmarkMedium: EmbeddedFont;
  /** IBM Plex Sans 400 — body and footer text. */
  body: EmbeddedFont;
  /** IBM Plex Mono 400 — the stat line. */
  mono: EmbeddedFont;
}

/** One sprite, already fetched and inlined as a `data:` URI. */
export interface ShareCardSprite {
  dataUri: string;
  /** Pixel art: keep the pixels crisp at the card's scale. */
  pixelated: boolean;
}

/** Everything the card embeds that had to be fetched first. */
export interface ShareCardAssets {
  fonts: ShareCardFonts;
  sprites: ShareCardSprite[];
}

/** The dark-theme brand palette (see the module comment). */
const COLORS = {
  page: "#0B0D10",
  border: "#252A32",
  foreground: "#F2F4F7",
  muted: "#98A1AD",
  accent: "#C8F031",
} as const;

const HEADING_STACK =
  "'Barlow Semi Condensed', 'IBM Plex Sans', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif";
const BODY_STACK =
  "'IBM Plex Sans', 'Segoe UI', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif";
const MONO_STACK = "'IBM Plex Mono', ui-monospace, Consolas, monospace";

/** The site every card foots, never translated. */
const FOOTER = "ohkolab.com";

/** One format's measurements, in card pixels. */
interface CardLayout {
  width: number;
  height: number;
  /** Outer padding on every side. */
  padding: number;
  /** The logo mark's side. */
  mark: number;
  /** The wordmark's font size next to the mark. */
  wordmark: number;
  /** Eyebrow (uppercase, muted). */
  eyebrow: number;
  /** Heading lines: font size, line height, and the clamp. */
  heading: number;
  headingLines: number;
  /** The mono stat line. */
  stat: number;
  /** Body lines: font size, line height, and the clamp. */
  body: number;
  bodyLines: number;
  /** The sprite row: box side, gap, and the largest box at any count. */
  spriteMax: number;
  /** The footer line. */
  footer: number;
  /** Space between stacked blocks. */
  gap: number;
}

const TALL: CardLayout = {
  width: 1080,
  height: 1920,
  padding: 96,
  mark: 56,
  wordmark: 48,
  eyebrow: 30,
  heading: 84,
  headingLines: 3,
  stat: 64,
  body: 38,
  bodyLines: 6,
  spriteMax: 168,
  footer: 26,
  gap: 32,
};

const LANDSCAPE: CardLayout = {
  width: 1200,
  height: 630,
  padding: 72,
  mark: 44,
  wordmark: 40,
  eyebrow: 26,
  heading: 64,
  headingLines: 2,
  stat: 48,
  body: 30,
  bodyLines: 2,
  spriteMax: 120,
  footer: 22,
  gap: 24,
};

/** The layout of one output format. */
function cardLayout(format: ShareCardFormat): CardLayout {
  return format === "1080x1920" ? TALL : LANDSCAPE;
}

/** The pixel size of one output format, as the canvas needs it. */
export function cardDimensions(format: ShareCardFormat): {
  width: number;
  height: number;
} {
  const layout = cardLayout(format);
  return { width: layout.width, height: layout.height };
}

/** Escapes text for XML character data and attribute values. */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * A rough full-width character: CJK ideographs, kana, full-width Latin and
 * CJK punctuation all set at ~1em, so their wrapping is exact. Everything
 * else is treated as proportional Latin (see `wrapText`).
 */
function isFullWidth(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) return false;
  return (
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2e80 && code <= 0xa4cf) || // CJK radicals..Yi
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul syllables
    (code >= 0xf900 && code <= 0xfaff) || // CJK compatibility
    (code >= 0x3000 && code <= 0x303f) || // CJK punctuation
    (code >= 0x3040 && code <= 0x30ff) || // Kana
    (code >= 0xff00 && code <= 0xff60) || // Full-width Latin
    (code >= 0xffe0 && code <= 0xffe6)
  );
}

/**
 * Wraps one text block by estimated width. SVG `<text>` does not wrap by
 * itself, and measuring real glyph widths would need a canvas (none in the
 * tests), so widths are estimated: full-width characters count 1em, Latin
 * `factor` em (0.55 body, 0.66 for the uppercase eyebrow). Latin breaks at
 * spaces, CJK anywhere, a word longer than the line breaks hard.
 */
export function wrapText(
  text: string,
  maxWidthEm: number,
  maxLines: number,
  factor = 0.55,
): string[] {
  const lines: string[] = [];
  let current = "";
  let width = 0;
  let lastSpace = -1;

  const pushLine = () => {
    lines.push(current.trimEnd());
    current = "";
    width = 0;
    lastSpace = -1;
  };

  for (const char of text.replace(/\s+/g, " ").trim()) {
    const charWidth = isFullWidth(char) ? 1 : factor;
    if (width + charWidth > maxWidthEm && current !== "") {
      if (char === " ") {
        pushLine();
        continue;
      }
      if (lastSpace > 0) {
        // Break at the last space and carry what followed it.
        const carried = current.slice(lastSpace + 1);
        lines.push(current.slice(0, lastSpace).trimEnd());
        current = carried;
        width = [...carried].reduce(
          (sum, c) => sum + (isFullWidth(c) ? 1 : factor),
          0,
        );
        lastSpace = -1;
      } else {
        pushLine();
      }
    }
    current += char;
    width += charWidth;
    if (char === " ") lastSpace = current.length - 1;
  }
  if (current.trimEnd() !== "") pushLine();

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines - 1);
    kept.push(
      truncateToWidth(lines.slice(maxLines - 1).join(" "), maxWidthEm, factor),
    );
    return kept;
  }
  return lines;
}

/**
 * Cuts one line to the estimated width, marking the cut with an ellipsis.
 * Used for the eyebrow (a single line) and for the tail of a text block
 * clamped to its line budget.
 */
function truncateToWidth(
  text: string,
  maxWidthEm: number,
  factor: number,
): string {
  // Reserve roughly one ellipsis of width up front.
  const budget = maxWidthEm - 0.6;
  let width = 0;
  let out = "";
  for (const char of text) {
    const charWidth = isFullWidth(char) ? 1 : factor;
    if (width + charWidth > budget) return `${out.trimEnd()}…`;
    out += char;
    width += charWidth;
  }
  return out;
}

/** Caps one line with an ellipsis character. */
export function fit(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}

/** A `@font-face` block for one embedded font, or nothing. */
function fontFace(
  family: string,
  weight: number,
  dataUri: EmbeddedFont,
): string {
  if (!dataUri) return "";
  return (
    `@font-face{font-family:'${family}';font-weight:${weight};` +
    `font-style:normal;src:url(${dataUri}) format('woff2');}`
  );
}

/**
 * The logo mark: the split O — a ring split by a diagonal bar, on its own,
 * no tile (`src/components/logo.tsx` is the in-app twin). The card is always
 * the dark identity theme, so the mark strokes in the lime accent.
 */
function logoMark(x: number, y: number, size: number): string {
  const unit = size / 100;
  return (
    `<g transform="translate(${x},${y}) scale(${unit})" fill="none" ` +
    `stroke="${COLORS.accent}" stroke-width="12" stroke-linecap="butt">` +
    `<path d="M77 37A31 31 0 0 1 37 77M23 63A31 31 0 0 1 63 23"/>` +
    `<path d="M69 31 31 69"/>` +
    `</g>`
  );
}

/** The wordmark: "OHKO" bold, "Lab" medium muted, as the header renders it. */
function wordmark(x: number, centerY: number, size: number): string {
  const baseline = centerY + size * 0.35;
  const ink = `font-family:${HEADING_STACK};font-weight:700;font-size:${size}px;fill:${COLORS.foreground}`;
  const lab = `font-family:${HEADING_STACK};font-weight:500;font-size:${size}px;fill:${COLORS.muted}`;
  return (
    `<text x="${x}" y="${baseline}" xml:space="preserve" style="${ink}">OHKO</text>` +
    `<text x="${x + size * 1.95}" y="${baseline}" style="${lab}">Lab</text>`
  );
}

/**
 * The share card as a standalone SVG string, with explicit width/height so
 * drawing it onto a canvas sizes it exactly.
 */
export function buildShareCardSvg(
  content: ShareCardContent,
  format: ShareCardFormat,
  assets: ShareCardAssets,
): string {
  const layout = cardLayout(format);
  const { padding, width } = layout;
  const inner = width - padding * 2;

  const styles =
    fontFace("Barlow Semi Condensed", 700, assets.fonts.heading) +
    fontFace("Barlow Semi Condensed", 500, assets.fonts.wordmarkMedium) +
    fontFace("IBM Plex Sans", 400, assets.fonts.body) +
    fontFace("IBM Plex Mono", 400, assets.fonts.mono);

  // Header: logo mark + wordmark, the app's own geometry in fixed colours.
  const header =
    logoMark(padding, padding, layout.mark) +
    wordmark(
      padding + layout.mark + 16,
      padding + layout.mark / 2,
      layout.wordmark,
    );

  // The stacked content, tracked as the baseline of the next block.
  const blocks: string[] = [];
  let baseline = padding + layout.mark + layout.gap * 2;

  if (content.eyebrow) {
    const text = fit(
      content.eyebrow.replace(/\s+/g, " ").trim(),
      Math.floor(inner / (layout.eyebrow * 0.66)),
    );
    blocks.push(
      `<text x="${padding}" y="${baseline + layout.eyebrow * 0.8}" ` +
        `style="font-family:${BODY_STACK};font-weight:600;font-size:${layout.eyebrow}px;` +
        `letter-spacing:4px;fill:${COLORS.muted}">${escapeXml(text.toUpperCase())}</text>`,
    );
    baseline += layout.eyebrow * 0.8 + layout.gap;
  }

  const headingLines = wrapText(
    content.heading,
    inner / layout.heading,
    layout.headingLines,
  );
  const headingHeight = layout.heading * 1.15;
  blocks.push(
    `<text x="${padding}" y="${baseline + layout.heading * 0.8}" ` +
      `style="font-family:${HEADING_STACK};font-weight:700;font-size:${layout.heading}px;` +
      `fill:${COLORS.foreground}">` +
      headingLines
        .map(
          (line, index) =>
            `<tspan x="${padding}"${index === 0 ? "" : ` dy="${headingHeight}"`}>${escapeXml(line)}</tspan>`,
        )
        .join("") +
      `</text>`,
  );
  baseline +=
    layout.heading * 0.8 +
    headingHeight * (headingLines.length - 1) +
    layout.gap;

  if (content.stat) {
    blocks.push(
      `<text x="${padding}" y="${baseline + layout.stat * 0.8}" ` +
        `style="font-family:${MONO_STACK};font-size:${layout.stat}px;` +
        `fill:${COLORS.foreground}">${escapeXml(content.stat)}</text>`,
    );
    baseline += layout.stat * 0.8 + layout.gap;
  }

  if (content.body) {
    const bodyLines = wrapText(
      content.body,
      inner / layout.body,
      layout.bodyLines,
    );
    const bodyHeight = layout.body * 1.4;
    blocks.push(
      `<text x="${padding}" y="${baseline + layout.body * 0.8}" ` +
        `style="font-family:${BODY_STACK};font-size:${layout.body}px;fill:${COLORS.muted}">` +
        bodyLines
          .map(
            (line, index) =>
              `<tspan x="${padding}"${index === 0 ? "" : ` dy="${bodyHeight}"`}>${escapeXml(line)}</tspan>`,
          )
          .join("") +
        `</text>`,
    );
    baseline +=
      layout.body * 0.8 + bodyHeight * (bodyLines.length - 1) + layout.gap;
  }

  // The sprite row: one row, sized so up to six sprites always fit.
  const sprites = assets.sprites.slice(0, 6);
  if (sprites.length > 0) {
    const gap = 24;
    const size = Math.max(
      88,
      Math.min(
        layout.spriteMax,
        Math.floor((inner - gap * (sprites.length - 1)) / sprites.length),
      ),
    );
    let x = padding;
    for (const sprite of sprites) {
      blocks.push(
        `<image x="${x}" y="${baseline}" width="${size}" height="${size}" ` +
          `preserveAspectRatio="xMidYMid meet" href="${sprite.dataUri}"` +
          `${sprite.pixelated ? ' style="image-rendering:pixelated"' : ""}/>`,
      );
      x += size + gap;
    }
  }

  // Footer: the site, bottom left, on every card.
  const footer =
    `<text x="${padding}" y="${layout.height - padding + layout.footer * 0.5}" ` +
    `style="font-family:${BODY_STACK};font-size:${layout.footer}px;fill:${COLORS.muted}">${FOOTER}</text>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" ` +
    `viewBox="0 0 ${layout.width} ${layout.height}">` +
    (styles ? `<defs><style>${styles}</style></defs>` : "") +
    `<rect width="${layout.width}" height="${layout.height}" fill="${COLORS.page}"/>` +
    `<rect x="2" y="2" width="${layout.width - 4}" height="${layout.height - 4}" rx="16" ` +
    `fill="none" stroke="${COLORS.border}" stroke-width="2"/>` +
    header +
    blocks.join("") +
    footer +
    `</svg>`
  );
}
