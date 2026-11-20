/**
 * "Save as image": compose the card (`svg.ts`), embed its fonts and sprites
 * (`assets.ts`), rasterize it to PNG through the browser canvas and hand
 * the user a download. This module is only ever reached through a dynamic
 * import from a "Save as image" menu, so none of it loads until the first
 * save.
 *
 * The flow is all browser: no service, no canvas library. The SVG string
 * goes through a blob URL into an <img> (which renders it with the same
 * engine as the page), the <img> is drawn onto a canvas at the format's
 * exact pixel size, and `toBlob("image/png")` produces the file.
 */

import { getLocale } from "@/lib/i18n/locale";
import { track } from "@/lib/telemetry/analytics";
import {
  loadShareCardFonts,
  loadShareCardSprites,
} from "@/lib/share-cards/assets";
import {
  buildShareCardSvg,
  cardDimensions,
  type ShareCardContent,
  type ShareCardFormat,
} from "@/lib/share-cards/svg";

/** Rasterizes one SVG string to a PNG blob at the format's pixel size. */
async function rasterize(svg: string, format: ShareCardFormat): Promise<Blob> {
  const { width, height } = cardDimensions(format);
  const svgUrl = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    image.width = width;
    image.height = height;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("The card could not be rendered."));
      image.src = svgUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("The canvas is unavailable.");
    }
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) {
      throw new Error("The PNG could not be encoded.");
    }
    return blob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/** Starts the browser download for one blob, as a `.png` file. */
function downloadPng(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** The download's file name, e.g. `ohkolab-team-1080x1920.png`. */
export function shareCardFilename(
  kind: ShareCardContent["kind"],
  format: ShareCardFormat,
): string {
  return `ohkolab-${kind}-${format}.png`;
}

/**
 * Saves one share card as a PNG download and reports it. Rejects when
 * anything in the pipeline fails (the menu turns that into an error toast);
 * the telemetry event only fires after the file is on its way.
 */
export async function saveShareCard(
  content: ShareCardContent,
  format: ShareCardFormat,
): Promise<void> {
  const [fonts, sprites] = await Promise.all([
    loadShareCardFonts(),
    loadShareCardSprites(content.species),
  ]);
  const svg = buildShareCardSvg(content, format, { fonts, sprites });
  const png = await rasterize(svg, format);
  downloadPng(png, shareCardFilename(content.kind, format));
  track("share_card_saved", {
    kind: content.kind,
    format,
    language: getLocale(),
  });
}
