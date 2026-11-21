import type { LearnKey } from "@/lib/i18n/entries/learn";

/**
 * The Japanese learn dictionary: exactly the same keys as the English one
 * (the parity test enforces it), with the same placeholders. Community
 * vocabulary: 乱数 for damage rolls, 確定1発 / 乱数1発 for OHKO, 同速 for
 * speed ties, ステータスポイント（SP） on first use.
 */
export const learnJa: { [K in LearnKey]: string } = {
  // ページ枠（フッターのリンクとタブタイトルはシェルの「footer.learn」）。
  "learn.title": "解説",
  "learn.description":
    "チャンピオンズのバトル数字を、ひとつずつやさしく解説します。",

  // ダメージの乱数。
  "learn.damageRolls.title": "ダメージの乱数",
  "learn.damageRolls.body1":
    "同じ技でも、ダメージは毎回同じにはなりません。攻撃・防御・場の効果をすべて計算したあと、85%〜100%のランダム係数（16段階の乱数）が掛かります。だから計算機は1つの数字ではなく、範囲で示します。",
  "learn.damageRolls.body2":
    "範囲の幅は常にダメージの約15%なので、相手の残りHPがその中に収まるときに大きな意味を持ちます。低い乱数なら耐えられ、高い乱数なら倒せます。",
  "learn.exampleTitle": "例",
  "learn.exampleLine":
    "{attacker}の{move}を{defender}に：{min}〜{max}ダメージ（最大HPの{minPercent}〜{maxPercent}%）。",
  "learn.exampleNote":
    "バーの斜線部分が乱数の範囲です。同じ技を同じポケモンに撃っても、16通りの乱数でダメージが変わります。",

  // OHKOと2HKO。
  "learn.ohko.title": "OHKOと2HKO",
  "learn.ohko.body1":
    "OHKO（1発）は1撃で相手を倒すこと。2HKO（2発）は2回、3HKO（3発）は3回の攻撃で倒します。技がどれに当たるかがわかれば、必要なターン数もわかります。",
  "learn.ohko.body2":
    "最小の乱数でも倒せれば「確定」、高い乱数だけが倒せるなら「乱数（可能性あり）」です。計算機はすべての結果に「確定1発」「乱数2発」のようなラベルを付けるので、ターン数を数える前にラベルを確認しましょう。",

  // ステータスポイント（SP）。
  "learn.statPoints.title": "ステータスポイント（SP）",
  "learn.statPoints.body1":
    "チャンピオンズでは全ポケモンがレベル50で、ステータスポイント（SP）がメインシリーズの個体値・努力値の代わりになります。1体につき66ポイント、1つのステータスには最大32まで振れます。",
  "learn.statPoints.body2":
    "66ポイントを6つのステータスに割り振るため、どこに振るかが構築の中心になります。2つのステータスに厚く振るか、細かく分散するか。チームビルダーと計算機のどちらでも、残りポイントを見ながら振れます。",

  // 同速。
  "learn.speedTies.title": "同速",
  "learn.speedTies.body1":
    "素早さが同じポケモン同士は、毎ターン50%ずつのランダムで先攻が決まります。計算機はこの場面を「同速」と表示します。",
  "learn.speedTies.body2":
    "お互いが一撃で倒し合える場面では、このコインフリップが勝敗を分けます。素早さを変える効果（ランク補正、追い風など）があれば、同速はどちらの向きにも解消されます。",
};
