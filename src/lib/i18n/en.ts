/**
 * The translation key union, assembled from the per-owner domain files:
 * `shell.ts`, `community.ts` and `account.ts` belong to the lead, `tools.ts`
 * to the tools stream. This module is type-only — the English strings
 * themselves live behind `@/lib/i18n/en-loader` (the shell statically, the
 * feature domains lazily with their routes), so nothing here pulls string
 * data into the importing chunk.
 */
import type { AccountKey } from "@/lib/i18n/entries/account";
import type { BattlesKey } from "@/lib/i18n/entries/battles";
import type { CommunityKey } from "@/lib/i18n/entries/community";
import type { ShellKey } from "@/lib/i18n/entries/shell";
import type { ToolsKey } from "@/lib/i18n/entries/tools";

/** Every translation key the app knows. */
export type TranslationKey =
  ShellKey | CommunityKey | AccountKey | ToolsKey | BattlesKey;
