import { isNativeApp } from "@/lib/platform";

/**
 * External links in the native app open in the system browser instead of the
 * app WebView: the legal pages' privacy-policy links, the attribution links
 * and every other absolute `http(s)` URL. Router links and same-origin URLs
 * are unaffected. The `@capacitor/browser` import stays dynamic behind
 * `isNativeApp()` so the plugin code never reaches the web bundle.
 */

/** True for absolute `http(s)` URLs that point away from the app's own origin. */
export function isExternalUrl(url: string, origin: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    return new URL(url).origin !== origin;
  } catch {
    return false;
  }
}

/** Opens an external URL in the system browser (a Chrome custom tab). */
export async function openInSystemBrowser(url: string): Promise<boolean> {
  if (!isNativeApp()) return false;
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
  return true;
}

/** Opens an external URL; used by the click interceptor. */
export type ExternalLinkOpener = (url: string) => boolean | Promise<boolean>;

/**
 * Intercepts clicks on anchors to external URLs: prevents the WebView
 * navigation and hands the URL to `open`. Internal links and modified clicks
 * (new tab, etc.) pass through untouched. Returns a disposer.
 */
export function setupExternalLinkInterceptor(
  doc: Document,
  origin: string,
  open: ExternalLinkOpener,
): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    ) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || !isExternalUrl(href, origin)) return;
    event.preventDefault();
    void open(href);
  };
  doc.addEventListener("click", onClick, { capture: true });
  return () => {
    doc.removeEventListener("click", onClick, { capture: true });
  };
}
