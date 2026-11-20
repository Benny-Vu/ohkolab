/**
 * The assets a share card embeds: the app's own font files (self-hosted
 * @fontsource packages, so the save never depends on a third-party font
 * CDN) and the species sprites, both inlined as `data:` URIs. An SVG loaded
 * into an <img> is a secure static context: it loads no external fonts or
 * images, so everything the card shows must be inside the SVG string.
 *
 * Both loaders cache and never throw: a font or sprite that cannot be
 * fetched (offline, blocked) is simply skipped and the card renders with
 * the family's fallbacks / without that sprite. Japanese text needs no
 * web font either way — it falls through to the system fonts, as in the
 * app itself.
 */

import barlow700 from "@fontsource/barlow-semi-condensed/files/barlow-semi-condensed-latin-700-normal.woff2?url";
import barlow500 from "@fontsource/barlow-semi-condensed/files/barlow-semi-condensed-latin-500-normal.woff2?url";
import plexSans400 from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url";
import plexMono400 from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?url";

import { getSprite } from "@/data/sprites";
import type { ShareCardFonts, ShareCardSprite } from "@/lib/share-cards/svg";

/** ArrayBuffer to base64, in chunks (btoa takes no huge strings). */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** One same-origin font file as a `data:` URI, or null when unreachable. */
async function fontDataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return `data:font/woff2;base64,${toBase64(await response.arrayBuffer())}`;
  } catch {
    return null;
  }
}

let fontsPromise: Promise<ShareCardFonts> | undefined;

/** The card's four fonts, fetched once per session and reused after that. */
export function loadShareCardFonts(): Promise<ShareCardFonts> {
  fontsPromise ??= (async () => {
    const [heading, wordmarkMedium, body, mono] = await Promise.all([
      fontDataUri(barlow700),
      fontDataUri(barlow500),
      fontDataUri(plexSans400),
      fontDataUri(plexMono400),
    ]);
    return { heading, wordmarkMedium, body, mono };
  })();
  return fontsPromise;
}

/** Blob to `data:` URI (keeps the sprite's own MIME type). */
function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

const spriteCache = new Map<string, Promise<string | null>>();

/** One sprite as a `data:` URI, or null when it cannot be fetched. */
function spriteDataUri(url: string): Promise<string | null> {
  let cached = spriteCache.get(url);
  if (!cached) {
    cached = fetch(url)
      .then(async (response) =>
        response.ok ? blobToDataUri(await response.blob()) : null,
      )
      .catch(() => null);
    spriteCache.set(url, cached);
  }
  return cached;
}

/**
 * The sprite row for a card: the team's species in order, unknown species
 * and unreachable sprites dropped (the card never shows a broken image).
 */
export async function loadShareCardSprites(
  species: readonly string[],
): Promise<ShareCardSprite[]> {
  const sprites: ShareCardSprite[] = [];
  for (const name of species.slice(0, 6)) {
    const sprite = getSprite(name);
    const dataUri = await spriteDataUri(sprite.url);
    if (dataUri) {
      sprites.push({ dataUri, pixelated: sprite.pixelated });
    }
  }
  return sprites;
}
