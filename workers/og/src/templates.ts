/**
 * Element trees for the generated preview images.
 *
 * workers-og's ImageResponse accepts either an HTML string (parsed by a
 * fragile, error-prone HTMLRewriter pipeline) or an element object
 * directly. We build the object: no HTML, no escaping, no parser. Text is
 * data in the tree, so nothing can inject markup into an image.
 *
 * The design is the app's dark theme: page background #0B0D10, foreground
 * #F2F4F7, muted #98A1AD and the lime brand accent #C8F031 (the
 * `--accent-brand` token in src/index.css). The wordmark is plain text —
 * no logo art.
 */

import { BRAND } from "./site";

/** What a generated image shows. */
export interface CardImageContent {
  /** The main line: a name, a team name, "OHKOLab"... */
  heading: string;
  /** A secondary line: a bio, a team's species, the tagline... */
  body: string | null;
  /**
   * Sprite image URLs to show in a row, already resolved (see
   * sprites.ts); empty for text-only cards. Pass URLs, not species
   * names, so this module stays free of lookups.
   */
  spriteUrls: string[];
}

/** A React-like element, as workers-og's ImageResponse expects. */
export interface CardNode {
  type: string;
  props: {
    style?: Record<string, string | number>;
    src?: string;
    width?: number;
    height?: number;
    children?: CardNode[] | string[];
  };
}

/** Caps a line so it can never blow up the fixed-size layout. */
function fit(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function text(
  content: string,
  style: Record<string, string | number>,
): CardNode {
  // Satori requires an explicit display on every div whose children is an
  // array — even a single-element one — so text nodes carry flex too.
  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", ...style },
      children: [content],
    },
  };
}

function div(style: Record<string, string | number>, children: CardNode[]) {
  return { type: "div", props: { style, children } };
}

/**
 * The card layout every image type shares: the OHKOLab wordmark in the
 * brand accent, the heading, the body line, and a row of sprites along
 * the bottom.
 */
export function buildCardTree(content: CardImageContent): CardNode {
  const children: CardNode[] = [
    // The wordmark: the accent square plus the name.
    div(
      {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "16px",
      },
      [
        {
          type: "div",
          props: {
            style: {
              width: "20px",
              height: "20px",
              backgroundColor: BRAND.accent,
            },
          },
        },
        text("OHKOLab", {
          fontSize: "40px",
          fontWeight: 700,
          color: BRAND.accent,
          letterSpacing: "4px",
        }),
      ],
    ),
    text(fit(content.heading.trim(), 60), {
      fontSize: "72px",
      fontWeight: 700,
      color: BRAND.foreground,
      marginTop: "32px",
      lineHeight: "1.1",
    }),
  ];
  if (content.body) {
    children.push(
      text(fit(content.body.trim(), 200), {
        fontSize: "32px",
        color: BRAND.muted,
        marginTop: "24px",
        lineHeight: "1.4",
      }),
    );
  }
  if (content.spriteUrls.length > 0) {
    children.push(
      div(
        {
          display: "flex",
          flexDirection: "row",
          gap: "24px",
          alignItems: "flex-end",
          marginTop: "40px",
        },
        content.spriteUrls.slice(0, 6).map<CardNode>((url) => ({
          type: "img",
          props: { src: url, width: 130, height: 130 },
        })),
      ),
    );
  }
  return div(
    {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "flex-start",
      width: "100%",
      height: "100%",
      backgroundColor: BRAND.page,
      border: `2px solid ${BRAND.border}`,
      padding: "56px",
    },
    children,
  );
}

/** The outermost element: the full canvas with the app's fonts. */
export function buildCardElement(content: CardImageContent): CardNode {
  return div(
    {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "flex-start",
      width: "1200px",
      height: "630px",
      backgroundColor: BRAND.page,
      padding: "72px",
      fontFamily: "'Barlow Semi Condensed', sans-serif",
    },
    [buildCardTree(content)],
  );
}
