/**
 * The battles dictionary: the battle board, the create form, the offers and
 * the matched exchange. Owned by the battles wave; the Japanese side must
 * keep exactly the same keys (the parity test enforces it).
 */

export const battlesEn = {
  // The board's own frame (the nav entry and the page title).
  "battles.title": "Battles",
} as const;

export type BattlesKey = keyof typeof battlesEn;
