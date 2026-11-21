import type { LearnKey } from "@/lib/i18n/entries/learn";

/**
 * The Japanese learn dictionary: exactly the same keys as the English one
 * (the parity test enforces it), with the same placeholders. The
 * explainer content lives in the registry (`@/features/learn/guides`).
 * Community vocabulary: 乱数 for damage rolls, 確定1発 / 乱数1発 for OHKO,
 * 同速 for speed ties, ステータスポイント（SP） on first use.
 */
export const learnJa: { [K in LearnKey]: string } = {
  // ページ枠（フッターのリンクとタブタイトルはシェルの「footer.learn」）。
  "learn.title": "解説",
  "learn.description":
    "チャンピオンズのバトル数字を、ひとつずつやさしく解説します。",

  // ダメージ乱数のライブ例。
  "learn.exampleTitle": "例",
  "learn.exampleLine":
    "{attacker}の{move}を{defender}に：{min}〜{max}ダメージ（最大HPの{minPercent}〜{maxPercent}%）。",
  "learn.exampleNote":
    "バーの斜線部分が乱数の範囲です。同じ技を同じポケモンに撃っても、16通りの乱数でダメージが変わります。",

  // セクション・ガイドページの枠。
  "learn.read": "詳しく読む",
  "learn.inThisSection": "このセクションの内容",
  "learn.searchTerms": "用語を検索",
  "learn.searchPlaceholder": "用語を検索",
  "learn.tryInCalc": "計算機で試す",
  "learn.openBattleMode": "バトルモードを開く",
  "learn.prevAria": "前のガイド：{title}",
  "learn.nextAria": "次のガイド：{title}",
  "learn.countOne": "1項目",
  "learn.countMany": "{count}項目",
  "learn.typeChart": "タイプ相性表",

  // タイプページ。
  "learn.types.attacking": "攻撃側",
  "learn.types.defending": "防御側",
  "learn.types.superEffective": "効果抜群",
  "learn.types.notVeryEffective": "効果いまひとつ",
  "learn.types.noEffect": "効かない",
  "learn.types.weakTo": "弱点",
  "learn.types.resists": "軽減",
  "learn.types.immuneTo": "無効",
  "learn.types.traits": "特徴",
  "learn.types.chartGuide": "行は攻撃側、列は防御側。",
  "learn.types.legendSuper": "効果抜群",
  "learn.types.legendResist": "効果いまひとつ",
  "learn.types.legendNoEffect": "効かない",
};
