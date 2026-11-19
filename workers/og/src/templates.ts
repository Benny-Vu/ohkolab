/**
 * HTML templates for the generated preview images.
 *
 * Pure string builders: workers-og parses the HTML with the Workers
 * runtime's HTMLRewriter and renders it with satori (see image.ts for the
 * glue). All user text (team names, bios, post bodies) goes through
 * escapeHtml before it lands in the markup.
 *
 * The design is the app's dark theme: page background #0B0D10, foreground
 * #F2F4F7, muted #98A1AD and the lime brand accent #C8F031 (the
 * `--accent-brand` token in src/index.css). The wordmark is plain text —
 * no logo art.
 */

import { escapeHtml } from "./meta";
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

/** Caps a line so it can never blow up the fixed-size layout. */
function fit(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * The card layout every image type shares: the OHKOLab wordmark in the
 * brand accent, the heading, the body line, and a row of sprites along
 * the bottom.
 */
export function buildCardHtml(content: CardImageContent): string {
  const heading = escapeHtml(fit(content.heading.trim(), 60));
  const body = content.body
    ? `<div style="font-size:32px;color:${BRAND.muted};margin-top:24px;line-height:1.4;font-family:'IBM Plex Sans',sans-serif">${escapeHtml(fit(content.body.trim(), 200))}</div>`
    : "";
  const sprites =
    content.spriteUrls.length > 0
      ? `<div style="display:flex;flex-direction:row;gap:24px;align-items:flex-end;margin-top:40px">${content.spriteUrls
          .slice(0, 6)
          .map(
            (url) =>
              `<img src="${escapeHtml(url)}" style="width:130px;height:130px" />`,
          )
          .join("")}</div>`
      : "";
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:flex-start;width:1200px;height:630px;background-color:${BRAND.page};padding:72px;font-family:'Barlow Semi Condensed',sans-serif">
  <div style="display:flex;flex-direction:column;justify-content:center;align-items:flex-start;width:100%;height:100%;background-color:${BRAND.page};border:2px solid ${BRAND.border};padding:56px">
    <div style="display:flex;flex-direction:row;align-items:center;gap:16px">
      <div style="width:20px;height:20px;background-color:${BRAND.accent}"></div>
      <div style="font-size:40px;font-weight:700;color:${BRAND.accent};letter-spacing:4px">OHKOLab</div>
    </div>
    <div style="font-size:72px;font-weight:700;color:${BRAND.foreground};margin-top:32px;line-height:1.1">${heading}</div>
    ${body}
    ${sprites}
  </div>
</div>`;
}
