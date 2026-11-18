/**
 * The English dictionary, assembled from the per-owner domain files: it is
 * the source of truth for every translation key. Domain files: `shell.ts`,
 * `community.ts` and `account.ts` belong to the lead, `tools.ts` to the
 * tools stream.
 */
import { accountEn } from "@/lib/i18n/entries/account";
import { communityEn } from "@/lib/i18n/entries/community";
import { shellEn } from "@/lib/i18n/entries/shell";
import { toolsEn } from "@/lib/i18n/entries/tools";

export const en = {
  ...shellEn,
  ...communityEn,
  ...accountEn,
  ...toolsEn,
};

/** Every translation key the app knows. */
export type TranslationKey = keyof typeof en;
