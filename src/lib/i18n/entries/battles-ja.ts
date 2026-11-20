import type { BattlesKey } from "@/lib/i18n/entries/battles";

/**
 * The Japanese battles dictionary: exactly the same keys as the English one
 * (the parity test enforces it), with the same placeholders.
 */
export const battlesJa: { [K in BattlesKey]: string } = {
  // 対戦ボード（ナビとページタイトル）。
  "battles.title": "対戦",
};
