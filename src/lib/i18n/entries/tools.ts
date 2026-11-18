/**
 * The tools dictionary: the damage calculator, the team builder and the
 * metagame section (`calc.*`, `teams.*`, `meta.*`). OWNED BY SUB-AGENT 2 of
 * the Japanese wave — the lead does not edit this file while that stream
 * runs. The seed keys below only exist so `en.ts` and `ja.ts` compile from
 * the start; extend (and rename within the three groups) freely.
 *
 * The Japanese side must keep exactly the same keys as the English side
 * (the parity test enforces it). Community terms: ダブル / シングル,
 * ダメージ計算 for the damage calc, 確定1発 / 乱数1発 for OHKO, and keep "SP"
 * with ステータスポイント on first use.
 */

export const toolsEn = {
  "calc.title": "Damage Calculator",
  "teams.title": "Teams",
  "meta.title": "Metagame",
} as const;

export type ToolsKey = keyof typeof toolsEn;

export const toolsJa: { [K in ToolsKey]: string } = {
  "calc.title": "ダメージ計算",
  "teams.title": "構築",
  "meta.title": "環境",
};
