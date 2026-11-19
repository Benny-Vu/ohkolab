import { toast } from "sonner";

import { useT, type TranslationParams } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";

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

/** Shares through the native sheet, or copies the link when there is none. */
export async function shareLink(target: ShareTarget): Promise<ShareOutcome> {
  const data = {
    title: target.title,
    text: target.text,
    url: target.url,
  };
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      // Closing the sheet is a choice, not a failure; anything else falls
      // through to the clipboard so the link still gets somewhere.
      if (error instanceof DOMException && error.name === "AbortError") {
        return "shared";
      }
    }
  }
  try {
    await navigator.clipboard.writeText(target.url);
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
export async function shareWithFeedback(
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
