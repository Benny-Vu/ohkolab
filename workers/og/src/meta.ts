/**
 * Meta-tag building: Open Graph and Twitter Card tags, and how they are
 * injected into the SPA's index.html for crawler requests.
 *
 * Pure: string in, string out. Every value that comes from the database
 * (names, bios, post bodies, team names) passes through escapeHtml
 * before it lands in an attribute, so quotes and angle brackets can never
 * break out of the tag — this is security-relevant, see meta.test.ts.
 */

import type { OgCard } from "./cards";
import { SITE_NAME } from "./site";

/**
 * Escapes text for use in HTML content and double- or single-quoted
 * attributes. `&` first, so no double-escaping can occur.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * The preview tags for one card: title, description, canonical URL, the
 * Open Graph set and the Twitter Card set. Each tag on its own line,
 * ready to drop into a <head>.
 */
export function buildPreviewTags(card: OgCard): string {
  const title = escapeHtml(card.title);
  const description = escapeHtml(card.description);
  const url = escapeHtml(card.url);
  const image = escapeHtml(card.imageUrl);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join("\n");
}

// The tags index.html ships (see the repo's index.html): everything a
// crawler could read as a preview, plus the <title>. Stripped and
// re-added per page, so a crawler never sees the home page's tags on a
// post URL. Each pattern uses a bounded lookahead so the attribute can
// sit anywhere in the tag; quoting style and casing vary too.
const REPLACEABLE_TAGS: readonly RegExp[] = [
  /<meta\s+(?=[^>]*(?:property|name)\s*=\s*["'](?:og:|twitter:))[^>]*>/gi,
  /<meta\s+(?=[^>]*name\s*=\s*["']description["'])[^>]*>/gi,
  /<link\s+(?=[^>]*rel\s*=\s*["']canonical["'])[^>]*>/gi,
  /<title>[^<]*<\/title>/i,
];

/** Removes index.html's preview tags so ours can replace them. */
export function stripPreviewTags(html: string): string {
  let out = html;
  for (const pattern of REPLACEABLE_TAGS) {
    out = out.replace(pattern, "");
  }
  return out;
}

/**
 * Serves index.html with a page's preview tags: strips the shipped tags,
 * then inserts ours just before `</head>`. When the head can't be found,
 * the tags are appended at the end — a crawler still reads them.
 */
export function injectPreview(html: string, card: OgCard): string {
  const stripped = stripPreviewTags(html);
  const tags = buildPreviewTags(card);
  const headEnd = stripped.toLowerCase().lastIndexOf("</head>");
  if (headEnd === -1) return `${stripped}\n${tags}\n`;
  const before = stripped.slice(0, headEnd);
  const after = stripped.slice(headEnd);
  return `${before}${tags}\n${after}`;
}

/**
 * A minimal standalone HTML document carrying just the preview tags, for
 * when the SPA's index.html cannot be fetched from the origin: the
 * crawler still sees the card.
 */
export function buildPreviewDocument(card: OgCard): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
${buildPreviewTags(card)}
</head>
<body></body>
</html>
`;
}
