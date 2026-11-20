import { toast } from "sonner";

import { useT, type TranslationParams } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";
import { track } from "@/lib/telemetry/analytics";
import type { SharedLinkKind } from "@/lib/telemetry/events";

/**
 * Sharing a link: the operating system's share sheet when the platform has
 * one (`navigator.share`: phones, the Android app), otherwise the link is
 * copied to the clipboard. No third-party share scripts.
 */

export interface ShareTarget {
  /** What the share sheet calls the link, e.g. a team or profile name. */
  title: string;
  /** Extra context, e.g. the first line of a post. */
  text?: string;
  url: string;
}

export type ShareOutcome = "shared" | "copied" | "failed";

/**
 * What was shared, from the link's route. Only this kind is ever sent to
 * telemetry — never the link, its query or anything personal in it.
 */
export function shareKindForUrl(url: string): SharedLinkKind | null {
  let pathname: string;
  try {
    pathname = new URL(url, window.location.origin).pathname;
  } catch {
    return null;
  }
  if (pathname.startsWith("/calc")) return "calc";
  if (pathname.startsWith("/teams")) return "team";
  if (pathname.startsWith("/u/")) return "profile";
  if (pathname.startsWith("/posts/")) return "post";
  if (pathname.startsWith("/g/")) return "group";
  return null;
}

/** Shares through the native sheet, or copies the link when there is none. */
export async function shareLink(target: ShareTarget): Promise<ShareOutcome> {
  const data = {
    title: target.title,
    text: target.text,
    url: target.url,
  };
  const kind = shareKindForUrl(target.url);
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      if (kind) track("link_shared", { kind });
      return "shared";
    } catch (error) {
      // Closing the sheet is a choice, not a failure; anything else falls
      // through to the clipboard so the link still gets somewhere.
      if (error instanceof DOMException && error.name === "AbortError") {
        if (kind) track("link_shared", { kind });
        return "shared";
      }
    }
  }
  try {
    await navigator.clipboard.writeText(target.url);
    if (kind) track("link_shared", { kind });
    return "copied";
  } catch {
    return "failed";
  }
}

/**
 * Shares with the standard feedback: nothing after the native sheet (it
 * speaks for itself), a toast after a copy, an error toast when even the
 * copy failed. Used by `ShareButton` and the post card's menu item.
 */
async function shareWithFeedback(
  target: ShareTarget,
  t: (key: TranslationKey, params?: TranslationParams) => string,
): Promise<void> {
  const outcome = await shareLink(target);
  if (outcome === "copied") {
    toast.success(t("share.copiedLink"));
  } else if (outcome === "failed") {
    toast.error(t("share.copyFailed"));
  }
}

/** The share behaviour as a hook, for menu items and other non-button spots. */
export function useShare(): (target: ShareTarget) => Promise<void> {
  const t = useT();
  return async (target: ShareTarget) => {
    await shareWithFeedback(target, t);
  };
}
