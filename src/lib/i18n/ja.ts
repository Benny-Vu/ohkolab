/**
 * The Japanese dictionary, assembled from the per-domain `-ja` files. It is
 * typed against the English dictionary so a missing key is a compile error
 * per domain — the top-level type stays Partial so the runtime fallback in
 * `t()` stays real, and the parity test still checks every key. This module
 * is only reached through the dynamic import in `@/lib/i18n/ja-loader`, so
 * none of it lands in the entry bundle; English users never download it.
 */
import { accountJa } from "@/lib/i18n/entries/account-ja";
import { communityJa } from "@/lib/i18n/entries/community-ja";
import { shellJa } from "@/lib/i18n/entries/shell-ja";
import { toolsJa } from "@/lib/i18n/entries/tools-ja";
import type { TranslationKey } from "@/lib/i18n/en";

export const ja: Partial<Record<TranslationKey, string>> = {
  ...shellJa,
  ...communityJa,
  ...accountJa,
  ...toolsJa,
};
