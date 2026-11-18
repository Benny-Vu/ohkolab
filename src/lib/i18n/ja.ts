/**
 * The Japanese dictionary, assembled from the per-owner domain files. It is
 * typed against the English dictionary so a missing key is a compile error
 * per domain — the top-level type stays Partial so the runtime fallback in
 * `t()` stays real, and the parity test still checks every key.
 */
import { accountJa } from "@/lib/i18n/entries/account";
import { communityJa } from "@/lib/i18n/entries/community";
import { shellJa } from "@/lib/i18n/entries/shell";
import { toolsJa } from "@/lib/i18n/entries/tools";
import type { TranslationKey } from "@/lib/i18n/en";

export const ja: Partial<Record<TranslationKey, string>> = {
  ...shellJa,
  ...communityJa,
  ...accountJa,
  ...toolsJa,
};
