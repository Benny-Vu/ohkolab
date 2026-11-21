/**
 * The Vocabulary section: the A–Z glossary. Every term is a short entry —
 * its slug is also the deep-link anchor (`/learn/vocabulary#stab`).
 *
 * Terms whose natural slug belongs to a guide take a `-term` suffix: the
 * guide keeps the clean URL (`/learn/tailwind`), the glossary keeps the
 * anchor (`#tailwind-term`). The vocabulary page renders full text, so a
 * term with its own guide gets a one-line twin here that names the guide.
 *
 * Every number here is checked against the game as the app models it
 * (`@smogon/calc` generation 0, `@pkmn/dex`) — see content.test.ts.
 *
 * Owned by the learn-content stream — the lead owns the registry types
 * (`@/features/learn/guides`).
 */
import type { LearnEntry } from "@/features/learn/guides";

export const vocabularyEntries: readonly LearnEntry[] = [
  {
    slug: "2hko",
    section: "vocabulary",
    long: false,
    title: { en: "2HKO", ja: "2発" },
    summary: {
      en: "A KO that takes two hits.",
      ja: "2回の攻撃で倒せること。",
    },
    body: {
      en: [
        "A 2HKO takes two hits: the first attack leaves the defender standing, the second one finishes it. A guaranteed 2HKO lands even on the lowest roll.",
      ],
      ja: [
        "2HKOは2発で倒すこと。1発目で耐えさせて、2発目で倒します。確定2発なら最も低い乱数でも2発で倒せます。",
      ],
    },
  },
  {
    slug: "back",
    section: "vocabulary",
    long: false,
    title: { en: "Back", ja: "控え" },
    summary: {
      en: "The Pokémon you brought but did not lead with.",
      ja: "選出したうち、先発以外のポケモン。",
    },
    body: {
      en: [
        "The back is the part of your selection that starts on the bench. They win games by coming in at the right moment, not by being saved forever.",
      ],
      ja: [
        "控えは、選出のうち最初から場に出ていないポケモンです。温存するだけでなく、ベストのタイミングで繰り出して勝負を決めます。",
      ],
    },
  },
  {
    slug: "bring-4",
    section: "vocabulary",
    long: false,
    title: { en: "Bring 4", ja: "4体選出" },
    summary: {
      en: "You never battle with the whole team; you pick what to bring.",
      ja: "6体のうち、このバトルに出すポケモンを選ぶこと。",
    },
    body: {
      en: [
        "Your team holds six Pokémon, but you only bring part of it to each battle: in Champions doubles you choose between four and six of them at team preview. Choosing well beats adding a sixth strong species.",
      ],
      ja: [
        "手持ちは6体でも、各バトルに連れて行くのは一部です。チャンピオンズのダブルではチームプレビューで4〜6体を選びます。強いポケモンを足すより、正しい選出が勝ちに直結します。",
      ],
    },
  },
  {
    slug: "chip-damage",
    section: "vocabulary",
    long: false,
    title: { en: "Chip damage", ja: "削り" },
    summary: {
      en: "Small repeated damage, not one big hit.",
      ja: "少しずつHPを削るダメージ。",
    },
    body: {
      en: [
        "Chip damage is the small stuff: sandstorm taking 1/16 of max HP a turn, recoil, entry hazards. It turns a 2HKO into an OHKO without spending a big attack.",
      ],
      ja: [
        "削りは小さなダメージの総和です。砂嵐の毎ターン最大HPの1/16、反動、まきびし系など。大きな技を使わずに2発圏を1発圏に押し込みます。",
      ],
    },
  },
  {
    slug: "choice-scarf",
    section: "vocabulary",
    long: false,
    title: { en: "Choice Scarf", ja: "拘りスカーフ" },
    summary: {
      en: "Speed 1.5×, locked into the first move you use.",
      ja: "素早さ1.5倍、最初に選んだ技で固定されるアイテム。",
    },
    body: {
      en: [
        "The holder's Speed is multiplied by 1.5, but it can only use the first move it executes. A common way to outspeed a whole team.",
      ],
      ja: [
        "持たせたポケモンの素早さが1.5倍になりますが、最初に選んだ技しか使えません。対面を抜く定番アイテムです。",
      ],
    },
  },
  {
    slug: "fake-out",
    section: "vocabulary",
    long: false,
    title: { en: "Fake Out", ja: "ねこだまし" },
    summary: {
      en: "A priority flinch move that only works on the first turn in.",
      ja: "場に出た最初のターンだけ使える先制ひるみ技。",
    },
    body: {
      en: [
        "Flinches the target, but only on the user's first turn on the field.",
      ],
      ja: ["相手をひるませますが、場に出た最初のターンしか使えません。"],
    },
  },
  {
    slug: "flinch",
    section: "vocabulary",
    long: false,
    title: { en: "Flinch", ja: "ひるみ" },
    summary: {
      en: "A flinched Pokémon does not act that turn.",
      ja: "ひるんだポケモンはそのターン動けない。",
    },
    body: {
      en: [
        "A flinch makes the target skip its move that turn. Fake Out flinches 100% of the time it connects, which is what makes an opening-turn Fake Out so strong.",
      ],
      ja: [
        "ひるみは、そのターンの相手の行動を1回止めます。ねこだましは命中すれば100%ひるませるため、初手のねこだましが強力になります。",
      ],
    },
  },
  {
    slug: "grounded",
    section: "vocabulary",
    long: false,
    title: { en: "Grounded", ja: "接地" },
    summary: {
      en: "Standing on the ground — what terrain needs to touch you.",
      ja: "地面に接している状態。フィールド効果の条件。",
    },
    body: {
      en: [
        "Terrains only affect grounded Pokémon; Flying-types are not grounded, so terrain boosts and blocks pass them by. Gravity grounds everything.",
      ],
      ja: [
        "フィールドは接地しているポケモンにだけ効果があります。ひこうタイプは接地していないため、フィールドの効果を受けません。じゅうりょく下では全員が接地します。",
      ],
    },
  },
  {
    slug: "guaranteed",
    section: "vocabulary",
    long: false,
    title: { en: "Guaranteed", ja: "確定" },
    summary: {
      en: "It happens on every damage roll, even the lowest.",
      ja: "最も低い乱数でも成立すること。",
    },
    body: {
      en: [
        "A guaranteed KO happens on every roll, not just the high ones. The calculator marks these: a guaranteed-OHKO label means no roll saves the defender.",
      ],
      ja: [
        "確定とは、高い乱数だけでなく最も低い乱数でも成立することです。計算機は「確定1発」のように表示し、確定なら乱数に助けられることはありません。",
      ],
    },
  },
  {
    slug: "intimidate-term",
    section: "vocabulary",
    long: false,
    title: { en: "Intimidate", ja: "威嚇" },
    summary: {
      en: "Lowers the opponent's Attack by one stage on entry.",
      ja: "場に出たとき、相手の攻撃を1段階下げる。",
    },
    body: {
      en: [
        "On switch-in, Intimidate lowers the Attack of the opposing Pokémon by one stage. Switching the holder out and back in triggers it again — see the Concepts guide.",
      ],
      ja: [
        "場に出たとき、相手の攻撃ランクを1段階下げます。交代して再び出すと再発動します。詳しくはバトルの仕組みの解説を参照してください。",
      ],
    },
  },
  {
    slug: "lead",
    section: "vocabulary",
    long: false,
    title: { en: "Lead", ja: "先発" },
    summary: {
      en: "The Pokémon you start the battle with.",
      ja: "バトル開始から場に出すポケモン。",
    },
    body: {
      en: [
        "Your leads are the one or two Pokémon that start the battle. In doubles they act together, so pick a pair whose moves cover each other.",
      ],
      ja: [
        "先発はバトル開始時に出す1〜2体です。ダブルでは2体で1組として動くため、互いを補えるペアを選びます。",
      ],
    },
  },
  {
    slug: "mega-evolution-term",
    section: "vocabulary",
    long: false,
    title: { en: "Mega Evolution", ja: "メガシンカ" },
    summary: {
      en: "A held Mega Stone turns a Pokémon into a stronger forme.",
      ja: "メガストーンでより強いフォルムに変化すること。",
    },
    body: {
      en: [
        "A Pokémon holding its own Mega Stone can Mega Evolve in battle: it takes on a forme with different stats, sometimes a different type and ability. In Champions you can use Mega Evolution once per battle — the Concepts guide covers the details.",
      ],
      ja: [
        "自分のメガストーンを持ったポケモンは、バトル中にメガシンカできます。種族値が変わり、タイプや特性も変わることがあります。チャンピオンズでは1試合に1回だけ使えます。詳しくはバトルの仕組みの解説を参照してください。",
      ],
    },
  },
  {
    slug: "nature",
    section: "vocabulary",
    long: false,
    title: { en: "Nature", ja: "性格" },
    summary: {
      en: "Raises one stat 10%, lowers another 10%.",
      ja: "1つのステータスを10%上げ、別の1つを10%下げる。",
    },
    body: {
      en: [
        "A nature raises one stat by 10% and lowers another by 10%; neutral natures do neither. Jolly raises Speed and lowers Special Attack — a common pick for fast physical attackers.",
      ],
      ja: [
        "性格は1つのステータスを10%上げ、別の1つを10%下げます（無補正の性格は変化なし）。陽気は素早さを上げて特攻を下げる、物理アタッカーの定番です。",
      ],
    },
  },
  {
    slug: "ohko-term",
    section: "vocabulary",
    long: false,
    title: { en: "OHKO", ja: "1発" },
    summary: {
      en: "One hit takes all of the defender's HP.",
      ja: "1回の攻撃で相手のHPを0にすること。",
    },
    body: {
      en: [
        "OHKO means one-hit KO: a single attack does more damage than the defender's whole HP bar. The Concepts guide explains rolls and guaranteed KOs.",
      ],
      ja: [
        "OHKOは1発で倒すこと（one-hit KO）。1回の攻撃で相手のHPをすべて削ります。乱数と確定の区別はバトルの仕組みの解説を参照してください。",
      ],
    },
  },
  {
    slug: "pivot",
    section: "vocabulary",
    long: false,
    title: { en: "Pivot", ja: "起点" },
    summary: {
      en: "A Pokémon that switches out while keeping the advantage.",
      ja: "交代で盤面を有利に進める役割。",
    },
    body: {
      en: [
        "A pivot is a Pokémon you switch out on purpose: it takes the hit or the bad matchup, and the teammate coming in starts its turn already positioned. Good pivoting is what makes the back more than a bench.",
      ],
      ja: [
        "起点（ピボット）は、あえて交代して盤面を作る役割です。不利な対面や攻撃を受け持つことで、次に出す味方が有利な状態で動けます。交代術がうまいほど控えの価値が上がります。",
      ],
    },
  },
  {
    slug: "priority",
    section: "vocabulary",
    long: false,
    title: { en: "Priority", ja: "先制技" },
    summary: {
      en: "Some moves strike first no matter the Speed stats.",
      ja: "素早さに関係なく先に動ける技。",
    },
    body: {
      en: [
        "Moves have a priority number: the higher it is, the earlier the move goes, before Speed is compared at all. Fake Out is +3, Follow Me +2, Aqua Jet +1, and Trick Room drags its user to -7.",
      ],
      ja: [
        "技には優先度（先制度）があります。数値が高いほど早く動き、素早さを比べる前に順番が決まります。ねこだましは+3、この指+2、アクアジェットは+1。トリックルームは逆に-7で最後になります。",
      ],
    },
  },
  {
    slug: "protect",
    section: "vocabulary",
    long: false,
    title: { en: "Protect", ja: "まもる" },
    summary: {
      en: "Blocks most moves for one turn; fails when used in a row.",
      ja: "1ターンほとんどの技を防ぐ。連続で出すと失敗しやすい。",
    },
    body: {
      en: ["Shields the user from most moves for one turn."],
      ja: ["そのターン、自分へのほとんどの技を防ぎます。"],
    },
  },
  {
    slug: "roll",
    section: "vocabulary",
    long: false,
    title: { en: "Roll", ja: "乱数" },
    summary: {
      en: "One of the sixteen possible damage values of a move.",
      ja: "同じ技が取りうる16通りのダメージ値の1つ。",
    },
    body: {
      en: [
        "Every attack rolls its damage from sixteen values between 85% and 100% of the total. A KO only on the high rolls is a roll KO; see the Damage rolls guide.",
      ],
      ja: [
        "攻撃のダメージは、合計値の85%〜100%の範囲の16個の値から乱数で決まります。「乱数1発」は高い乱数のときだけ倒せるということです。詳しくはダメージの乱数の解説を参照してください。",
      ],
    },
  },
  {
    slug: "set",
    section: "vocabulary",
    long: false,
    title: { en: "Set", ja: "型" },
    summary: {
      en: "One Pokémon's full build: moves, item, ability, nature, SP.",
      ja: "1体の育成内容の全体像。",
    },
    body: {
      en: [
        "A set is everything one Pokémon brings to a battle: its four moves, held item, ability, nature and how its 66 Stat Points are spent. The same species can run very different sets.",
      ],
      ja: [
        "型とは、1体がバトルに持つすべての内容です。4つの技、持ち物、特性、性格、そしてステータスポイント（SP）66の振り方。同じポケモンでも型は大きく変わります。",
      ],
    },
  },
  {
    slug: "sp",
    section: "vocabulary",
    long: false,
    title: { en: "SP", ja: "ステータスポイント（SP）" },
    summary: {
      en: "Champions' 66 build points, replacing EVs and IVs.",
      ja: "個体値・努力値の代わりとなる66ポイント。",
    },
    body: {
      en: [
        "SP are the points every Champions Pokémon spends on its stats: 66 in total, at most 32 in one. The Stat Points guide covers the budget.",
      ],
      ja: [
        "SP（ステータスポイント）は、各ポケモンがステータスに割り振る66ポイントです。1つのステータスには最大32まで振れます。詳しくはステータスポイント（SP）の解説を参照してください。",
      ],
    },
  },
  {
    slug: "speed-control-term",
    section: "vocabulary",
    long: false,
    title: { en: "Speed control", ja: "素早さ操作" },
    summary: {
      en: "Anything that changes who moves first.",
      ja: "行動順を変えるすべての手段。",
    },
    body: {
      en: [
        "Speed control is anything that rewrites turn order: Tailwind, Trick Room, Speed drops like Icy Wind, paralysis. The Concepts guide walks through the options.",
      ],
      ja: [
        "素早さ操作とは、行動順を書き換えるすべての手段です。追い風、トリックルーム、こごえるかぜなどの素早さ下降、まひなど。選択肢はバトルの仕組みの解説にまとめてあります。",
      ],
    },
  },
  {
    slug: "speed-tie",
    section: "vocabulary",
    long: false,
    title: { en: "Speed tie", ja: "同速" },
    summary: {
      en: "Same Speed means a coin flip for who moves first.",
      ja: "素早さが同じなら先攻はコインフリップ。",
    },
    body: {
      en: [
        "When both Pokémon have the same Speed, who moves first is a random pick each turn. The Speed ties guide covers when that matters.",
      ],
      ja: [
        "素早さが同じとき、先に動くのは毎ターンランダムで決まります。どの場面で重要になるかは同速の解説を参照してください。",
      ],
    },
  },
  {
    slug: "spread",
    section: "vocabulary",
    long: false,
    title: { en: "Spread", ja: "配分" },
    summary: {
      en: "How a set spends its 66 Stat Points.",
      ja: "66ポイントのステータスへの割り振り方。",
    },
    body: {
      en: [
        "A spread is the way a set distributes its Stat Points — for example 32 Speed with the rest in Attack. Spreads are built to survive a specific hit or outspeed a specific threat.",
      ],
      ja: [
        "配分とは、型がステータスポイントをどう割り振るかです。たとえば素早さに32、残りを攻撃に、といった具合。特定の技を耐える、特定の相手を抜くために調整します。",
      ],
    },
  },
  {
    slug: "spread-move",
    section: "vocabulary",
    long: false,
    title: { en: "Spread move", ja: "全体技" },
    summary: {
      en: "A move that hits both foes at once, at reduced power.",
      ja: "相手2体を同時に攻撃する技。",
    },
    body: {
      en: [
        "A spread move targets both foes in doubles, at 0.75× the damage it would do to one. Rock Slide and Icy Wind are the classics.",
      ],
      ja: [
        "全体技はダブルで相手2体を同時に狙い、1体あたりのダメージは0.75倍になります。定番は岩石封じとこごえるかぜです。",
      ],
    },
  },
  {
    slug: "stab",
    section: "vocabulary",
    long: false,
    title: { en: "STAB", ja: "タイプ一致" },
    summary: {
      en: "Same-Type Attack Bonus: a move of the user's own type hits harder.",
      ja: "自分のタイプと同じ技のダメージが上がる仕組み。",
    },
    body: {
      en: [
        "A move whose type matches one of the attacker's types gets a 1.5× damage bonus.",
      ],
      ja: ["攻撃側のタイプと同じタイプの技は、ダメージが1.5倍になります。"],
    },
  },
  {
    slug: "tailwind-term",
    section: "vocabulary",
    long: false,
    title: { en: "Tailwind", ja: "追い風" },
    summary: {
      en: "Doubles your side's Speed for four turns.",
      ja: "4ターンのあいだ、味方の素早さが2倍になる。",
    },
    body: {
      en: [
        "Tailwind doubles the Speed stat of every Pokémon on your side for four turns. The Field conditions guide covers the timing.",
      ],
      ja: [
        "追い風は4ターンのあいだ、味方全員の素早さを2倍にします。発動のタイミングなどはフィールド状態の解説を参照してください。",
      ],
    },
  },
  {
    slug: "team-preview-term",
    section: "vocabulary",
    long: false,
    title: { en: "Team preview", ja: "チームプレビュー" },
    summary: {
      en: "The screen where both teams are shown and you choose what to bring.",
      ja: "互いの手持ちを見せ合い、選出を決める画面。",
    },
    body: {
      en: [
        "Team preview shows both players' teams before the battle and is where you pick your leads and your back. The Concepts guide covers how to read it.",
      ],
      ja: [
        "チームプレビューは、バトル前に互いの手持ちを確認して選出を決める画面です。先発と控えを選びます。読み方はバトルの仕組みの解説を参照してください。",
      ],
    },
  },
  {
    slug: "trick-room-term",
    section: "vocabulary",
    long: false,
    title: { en: "Trick Room", ja: "トリックルーム" },
    summary: {
      en: "For five turns, the slower Pokémon moves first.",
      ja: "5ターンのあいだ、遅いポケモンが先に動く。",
    },
    body: {
      en: [
        "Trick Room reverses turn order for five turns: the slowest Pokémon acts first, and equal Speeds stay a coin flip. The Field conditions guide covers playing around it.",
      ],
      ja: [
        "トリックルームは5ターンのあいだ、行動順を逆転させます。最も遅いポケモンが先に動き、同速はコインフリップのままです。立ち回りはフィールド状態の解説を参照してください。",
      ],
    },
  },
];
