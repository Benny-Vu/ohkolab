/**
 * The Concepts section: how Champions battles work. The four original
 * explainers moved here from the old single-page /learn (their slugs are
 * the anchors the calc links to); the battle-basics, support and
 * damage entries come from the learn-content stream.
 *
 * Owned by the learn-content stream — the lead owns the registry types
 * (`@/features/learn/guides`).
 */
import type { LearnEntry } from "@/features/learn/guides";

export const conceptEntries: readonly LearnEntry[] = [
  {
    slug: "damage-rolls",
    section: "concepts",
    long: true,
    title: { en: "Damage rolls", ja: "ダメージの乱数" },
    summary: {
      en: "Why the same move does different damage every time.",
      ja: "同じ技でもダメージが毎回変わる理由。",
    },
    body: {
      en: [
        "The same move does not do the same damage every time. Once the game has added up attack, defence and every field effect, it multiplies the total by a random factor between 85% and 100% — one of sixteen rolls. That is why the calculator shows a range instead of a single number.",
        "The range is always about 15% of the damage, so it matters most when the defender's HP sits inside it: the low roll leaves it standing, the high roll does not.",
      ],
      ja: [
        "同じ技でも、ダメージは毎回同じにはなりません。攻撃・防御・フィールド効果をすべて合計したあと、ゲームはその値に85%〜100%の乱数（16パターンのいずれか）を掛けます。だから計算機は1つの数字ではなく範囲を表示します。",
        "範囲は常にダメージの約15%なので、防御側の残りHPがその中にあるときに最も重要です。低い乱数なら耐えられ、高い乱数なら倒れます。",
      ],
    },
    example: "damage-rolls",
    calcLink: "/calc",
  },
  {
    slug: "ohko",
    section: "concepts",
    long: true,
    title: { en: "OHKO and 2HKO", ja: "1発（OHKO）と2発（2HKO）" },
    summary: {
      en: "How many hits a KO takes, and when it is only a chance.",
      ja: "何発で倒せるか、そして確定か乱数か。",
    },
    body: {
      en: [
        "OHKO means one-hit KO: the defender loses all of its HP to a single hit. A 2HKO takes two hits, a 3HKO three. Know which one a move is and you know how many turns you have.",
        "A KO is guaranteed when even the lowest roll finishes the job; it is only a chance when just the high rolls do. The calculator labels every result — OHKO, 2HKO, guaranteed 2HKO — so check the label before you count turns.",
      ],
      ja: [
        "OHKOは1発で倒すこと（one-hit KO）。防御側のHPが1回の攻撃で0になります。2HKOは2発、3HKOは3発。技がどれに当たはまるかを知れば、自分のターン数がわかります。",
        "最も低い乱数でも倒せれば「確定」、高い乱数だけが倒せる場合は「乱数」です。計算機はすべての結果にラベルを付ける（OHKO、2HKO、確定2HKO）ので、ターン数を数える前にラベルを確認しましょう。",
      ],
    },
    calcLink: "/calc",
  },
  {
    slug: "stat-points",
    section: "concepts",
    long: true,
    title: { en: "Stat Points (SP)", ja: "ステータスポイント（SP）" },
    summary: {
      en: "Champions replaces EVs and IVs with 66 points to spend.",
      ja: "チャンピオンズでは個体値・努力値の代わりに66ポイントを割り振ります。",
    },
    body: {
      en: [
        "In Champions every Pokémon is level 50, and Stat Points — SP — replace the EVs and IVs of the main games. Each Pokémon gets 66 points, and one stat can take at most 32.",
        "66 points do not go far across six stats, so where they go is the heart of a build: two stats near the cap, or a thinner spread over more of them. The team builder and the calculator both show the budget while you spend it.",
      ],
      ja: [
        "チャンピオンズではすべてのポケモンがレベル50で、本体シリーズの個体値・努力値の代わりにステータスポイント（SP）を使います。1体につき66ポイントで、1つのステータスには最大32まで振れます。",
        "66ポイントを6つのステータスに振り分けるので、どこに振るかが育成の核心です。2つのステータスを上限近くまで厚くするか、より多くのステータスに薄く広げるか。チームビルダーと計算機はどちらも残りポイントを表示します。",
      ],
    },
  },
  {
    slug: "speed-ties",
    section: "concepts",
    long: true,
    title: { en: "Speed ties", ja: "同速" },
    summary: {
      en: "Same Speed means a coin flip for who moves first.",
      ja: "素早さが同じなら、先に動くのはコインフリップ。",
    },
    body: {
      en: [
        "When both Pokémon have the same Speed stat, the game picks who moves first at random: a 50/50 coin flip, rolled again every turn. The calculator marks these matchups as a speed tie.",
        "Ties matter most when each side can knock the other out first — whoever wins the flip usually wins the trade. Anything that changes Speed (stat boosts, effects like Tailwind) breaks a tie, in either direction.",
      ],
      ja: [
        "両者の素早さが同じとき、先に動くのはゲームがランダムで決めます。50/50のコインフリップで、毎ターン振り直されます。計算機はこの対戦を「同速」と表示します。",
        "同速が最も重要なのは、どちらも先制で倒せる場面です。コインフリップに勝った側が通常は有利になります。素早さを変えるもの（ランク補正、追い風など）は、どちらの向きでも同速を解消します。",
      ],
    },
    calcLink: "/calc",
  },
];
