/**
 * The Concepts section: how Champions battles work. The four original
 * explainers keep their slugs and their own guide pages — the calc links
 * to them — and the new battle-basics, support, speed, damage and Mega
 * entries are short entries that show their full text on the section page.
 *
 * Every number here is checked against the game as the app models it
 * (`@smogon/calc` generation 0, `@pkmn/dex`) — see content.test.ts. The
 * Champions format facts (six-Pokémon teams, bringing four to six in
 * doubles, Mega Evolution once per battle) are confirmed from the owner's
 * verified sources in the vault's metagame-data-sources.md.
 *
 * Owned by the learn-content stream — the lead owns the registry types
 * (`@/features/learn/guides`).
 */
import type { LearnEntry } from "@/features/learn/guides";

export const conceptEntries: readonly LearnEntry[] = [
  {
    slug: "team-preview",
    section: "concepts",
    long: false,
    title: { en: "Team preview and bring 4", ja: "チームプレビューと選出" },
    summary: {
      en: "You see all six of the opponent's Pokémon and choose what to bring.",
      ja: "相手の6体を見て、連れて行くポケモンを選ぶ。",
    },
    body: {
      en: [
        "A Champions team holds six Pokémon, but no battle uses them all the same way. At team preview both players see both teams, and you choose what to bring — in doubles, between four and six of your six — plus your leads, the pair that starts on the field, and the back in reserve.",
        "Read the opponent the same way: which of your Pokémon they can OHKO, which of theirs you can OHKO, and whether the battle will be about speed, Trick Room or weather. The selection you make here decides more games than any single move.",
      ],
      ja: [
        "チャンピオンズの手持ちは6体ですが、毎バトルで全部を同じようには使いません。チームプレビューでは両者が互いの手持ちを確認し、連れて行くポケモンを選びます。ダブルでは6体のうち4〜6体を選び、先発2体と控えも決めます。",
        "相手の6体も同じように読みます。どのポケモンが自分のどのポケモンを1発で倒せるか、逆にどれを倒せるか、バトルが素早さ・トリックルーム・天候のどれで動くか。この選出が、どんな1手よりも勝負を左右します。",
      ],
    },
    calcLink: "/calc/battle",
  },
  {
    slug: "switching",
    section: "concepts",
    long: false,
    title: { en: "Switching and positioning", ja: "交代と盤面" },
    summary: {
      en: "Who is on the field decides what you can threaten and what you risk.",
      ja: "場に誰がいるかが、与える脅威とリスクを決める。",
    },
    body: {
      en: [
        "Switching trades a turn for a better position: the Pokémon leaving takes itself out of a bad matchup, and the one arriving comes in ready to act next turn. Some abilities pay you for it — Intimidate lowers the opponent's Attack every time its holder enters, so moving it out and back in is a real play, not a wasted turn.",
        "Switches also read the opponent. Attacking into a Protect or a switch wastes your turn; switching to a Pokémon that punishes their choice makes their good play worse. Every switch shares one rule: the incoming Pokémon should do more for you where it lands than the one it replaces.",
      ],
      ja: [
        "交代は1ターンを使って盤面を良くする一手です。悪い対面から離れ、次のターンから動ける状態で着地します。交代に見合いが出る特性もあります。威嚇は場に出るたびに相手の攻撃を下げるので、出し戻し（サイクリング）は無駄なターンではなく立派な戦術です。",
        "交代は相手を読む行為でもあります。まもるや相手の交代を読んで空振りすると、そのターンが丸ごと消えます。どの交代にも共通する基準は1つです。出すポケモンが、下がるポケモン以上にその場で働けるかどうか。",
      ],
    },
    calcLink: "/calc/battle",
  },
  {
    slug: "double-targeting",
    section: "concepts",
    long: false,
    title: { en: "Double targeting", ja: "集中攻撃" },
    summary: {
      en: "Both of your Pokémon attack the same target in one turn.",
      ja: "味方2体で同じ1体を攻撃すること。",
    },
    body: {
      en: [
        "In doubles you can aim both attackers at the same target. Two hits in one turn KO a Pokémon that neither attacker could OHKO alone, removing it from the game before it acts again.",
        "The cost is the other foe: it acts freely that turn. Double targeting trades a threat you end now for a threat you leave standing — the faster you can end it, the better the trade.",
      ],
      ja: [
        "ダブルでは、味方2体で同じ1体を狙えます。どちらか1体では1発で倒せないポケモンも、1ターンで2回の攻撃を合わせれば倒せ、次の行動を奪えます。",
        "その代償は、もう1体の相手が自由に動くことです。集中攻撃は「今排除する脅威」と「残す脅威」の交換です。早く倒せるほど、交換は有利になります。",
      ],
    },
  },
  {
    slug: "protect-scouting",
    section: "concepts",
    long: false,
    title: { en: "Protect and scouting", ja: "まもると情報" },
    summary: {
      en: "One safe turn to see what the opponent does.",
      ja: "1ターン安全に過ごして相手の手を見る。",
    },
    body: {
      en: [
        "Protect blocks most moves for one turn. It works the first time and gets less reliable each time it is used in a row, so a raw chain of Protects eventually fails.",
        "That safe turn is how you scout: watch what both foes target, spend a turn of opposing Tailwind or Trick Room, or shield a Pokémon that would otherwise have to guess. Two of the strongest doubles plays — Fake Out plus Protect — come from the same idea: act first with one, lose nothing with the other.",
      ],
      ja: [
        "まもるはそのターン、ほとんどの技を防ぎます。ただし連続で使うと成功率が下がっていくため、まもる連打はいずれ失敗します。",
        "この安全な1ターンで偵察します。相手2体の狙い先を見る、相手の追い風やトリックルームのターンを1つ消化する、読みで動かなくて済むようにする。ねこだまし＋まもるというダブルの強い動きも同じ考え方から来ています。",
      ],
    },
  },
  {
    slug: "fake-out-play",
    section: "concepts",
    long: false,
    title: { en: "Fake Out", ja: "ねこだまし" },
    summary: {
      en: "Priority +3 and a guaranteed flinch — once, on the way in.",
      ja: "優先度+3で確定ひるみ。出てきた最初のターンだけ。",
    },
    body: {
      en: [
        "Fake Out is a 40-power Normal move with priority +3 that flinches the target 100% of the time. It only works on the user's first turn on the field — after that it fails.",
        "In doubles that makes it the opening-turn move: flinch one foe while your partner attacks, redirects or sets up. Bringing it on a Pokémon you will switch often restarts its clock, since every switch-in is a first turn again.",
      ],
      ja: [
        "ねこだましは威力40のノーマル技で、優先度+3、命中すれば100%ひるませます。ただし場に出た最初のターンしか成功しません。",
        "ダブルでは初手の切り札です。1体をひるませている間に、相棒は攻撃・この指・補助を自由に選べます。頻繁に交代するポケモンに持たせれば、出し直すたびに「最初のターン」がやり直せます。",
      ],
    },
    calcLink: "/calc/battle",
  },
  {
    slug: "redirection",
    section: "concepts",
    long: false,
    title: { en: "Redirection", ja: "この指と怒りの粉" },
    summary: {
      en: "Follow Me and Rage Powder pull attacks onto one Pokémon.",
      ja: "相手の攻撃を1体に集めるフォロー技。",
    },
    body: {
      en: [
        "Follow Me and Rage Powder are priority +2 and, until the end of the turn, redirect single-target attacks from the opposing side to the user. Both fail outside doubles.",
        "Redirection shields the partner for one turn: the user takes everything so the ally — often a set-up or a slow attacker — can act untouched. It pairs naturally with a bulky user, since the whole point is being hit.",
      ],
      ja: [
        "この指（Follow Me）と怒りの粉（Rage Powder）は優先度+2で、そのターンの終わりまで、相手側の単体攻撃を自分に向け直します。ダブル以外では失敗します。",
        "1ターン、相棒を守る交代要員です。すべての攻撃を自分が受けることで、積み技や遅いアタッカーが無傷で動けます。叩かれること自体が役目なので、耐久のあるポケモンと相性が良いです。",
      ],
    },
    calcLink: "/calc/battle",
  },
  {
    slug: "helping-hand",
    section: "concepts",
    long: false,
    title: { en: "Helping Hand", ja: "てだすけ" },
    summary: {
      en: "Priority +5: an ally's move does 1.5× damage that turn.",
      ja: "優先度+5で、味方の技の威力を1.5倍にする。",
    },
    body: {
      en: [
        "Helping Hand is priority +5 and multiplies the power of one adjacent ally's move by 1.5 for that turn. It has to come before the ally's attack, which is what the priority is for.",
        "It turns two attackers into one bigger one — a common way to reach an OHKO that neither Pokémon could achieve alone, on a turn when double targeting is the plan anyway.",
      ],
      ja: [
        "てだすけは優先度+5で、隣の味方がそのターンに使う技の威力を1.5倍にします。味方の攻撃より先に動く必要があり、そのための優先度です。",
        "2体ぶんの攻撃を1本の大技に変える技です。集中攻撃のターンに、どちらか1体では届かない1発圏を作る定番の方法です。",
      ],
    },
  },
  {
    slug: "intimidate",
    section: "concepts",
    long: false,
    title: { en: "Intimidate", ja: "威嚇" },
    summary: {
      en: "Lowers both foes' Attack by one stage, every time it enters.",
      ja: "場に出るたび、相手2体の攻撃を1段階下げる。",
    },
    body: {
      en: [
        "Intimidate lowers the Attack of the opposing Pokémon by one stage when its holder enters the field — both foes in doubles, and again on every later switch-in.",
        "Cycling it — switching the holder out and back in — repeats the drop and wastes nothing. A -1 Attack from an Intimidate often turns the opponent's OHKO into a 2HKO; check it in the calculator before you assume you were safe.",
      ],
      ja: [
        "威嚇は、持ち主が場に出たときに相手の攻撃ランクを1段階下げます。ダブルでは相手2体が対象で、交代して出し直すたびに再発動します。",
        "出し戻し（サイクリング）で何度でも下げられます。-1の攻撃ランクで、相手の1発圏が2発圏になることは珍しくありません。安全だと思い込む前に計算機で確認しましょう。",
      ],
    },
    calcLink: "/calc",
  },
  {
    slug: "speed-control",
    section: "concepts",
    long: false,
    title: { en: "Speed control", ja: "素早さ操作" },
    summary: {
      en: "Tailwind, Trick Room, Speed drops and paralysis rewrite turn order.",
      ja: "追い風・トリックルーム・素早さ下降・まひで行動順を作る。",
    },
    body: {
      en: [
        "In doubles both sides act every turn, so who moves first often decides the whole trade. The two big buttons are Tailwind, which doubles your side's Speed for four turns, and Trick Room, which reverses turn order for five turns; teams are usually built to lean on one of them.",
        "The smaller tools stack with either plan: Icy Wind and Electroweb hit both foes at 0.75× and lower their Speed by one stage every time they hit, and a paralyzed Pokémon — Thunder Wave is 90% accurate — has its Speed halved. Speed control also decides every speed tie in your favour, when you are the one who set it first.",
      ],
      ja: [
        "ダブルでは両者が毎ターン動くため、先に動ける側が交代全体を握ります。2大主役は、4ターン味方の素早さを2倍にする追い風と、5ターン行動順を逆転させるトリックルームです。構築はどちらかに寄せて作るのが普通です。",
        "小さな道具はどちらのプランとも重ねられます。こごえるかぜとエレキネットは0.75倍で相手2体を攻撃し、命中するたびに素早さを1段階下げます。でんじは（命中率90%）でまひにすれば、素早さは半分になります。先に仕掛けた側が、同速のコインフリップも自分のものにします。",
      ],
    },
    calcLink: "/calc/battle",
  },
  {
    slug: "priority-moves",
    section: "concepts",
    long: false,
    title: {
      en: "Priority moves and Psychic Terrain",
      ja: "先制技とサイコフィールド",
    },
    summary: {
      en: "Moves that ignore Speed — and the terrain that stops them.",
      ja: "素早さを無視する技と、それを止めるフィールド。",
    },
    body: {
      en: [
        "Priority moves act in priority order before Speed is compared: Fake Out at +3, Follow Me at +2, Aqua Jet at +1. They let a slow Pokémon strike first anyway — or a fast one finish a KO before the opponent can answer.",
        "Psychic Terrain is the answer: while it is up, grounded Pokémon cannot be hit by priority moves at all. A grounded team under Psychic Terrain ignores Fake Out, Aqua Jet and Sucker Punch entirely.",
      ],
      ja: [
        "先制技は、素早さを比べる前に優先度の順で動きます。ねこだまし+3、この指+2、アクアジェット+1。遅いポケモンでも先に動けますし、速いポケモンなら相手の行動前にトドメを刺せます。",
        "その答えがサイコフィールドです。発動中、接地しているポケモンは先制技の攻撃対象になりません。接地側の構築はねこだましもアクアジェットもふいうちも無視できます。",
      ],
    },
  },
  {
    slug: "spread-moves",
    section: "concepts",
    long: false,
    title: { en: "Spread moves", ja: "全体技" },
    summary: {
      en: "Hitting both foes at once, at 0.75× the damage.",
      ja: "相手2体を同時に、0.75倍のダメージで攻撃する。",
    },
    body: {
      en: [
        "In doubles, a move that targets both foes hits each at 0.75× the damage it would do to a single target; in singles the same move hits at full power. Some, like Earthquake, also hit your ally.",
        "The 0.75× is why rock slides miss KOs that single-target moves land, and why 0.75-resistant spreads matter. What you buy is two rolls and two flinch chances for one move slot.",
      ],
      ja: [
        "ダブルでは、相手2体を狙う技は1体あたり0.75倍のダメージになります。シングルでは同じ技が等倍で入ります。じしんのように、味方も巻き込む技もあります。",
        "0.75倍のせいで、単体技なら倒せる場面で岩石封じが乱数になることがあります。その代わり、技1つで乱数2つぶんと、怯み2つぶんを同時に買えます。",
      ],
    },
    calcLink: "/calc",
  },
  {
    slug: "stat-stages",
    section: "concepts",
    long: false,
    title: { en: "Stat stages", ja: "ランク補正" },
    summary: {
      en: "In-battle boosts: each stage up multiplies a stat by 1.5, then 2, and so on.",
      ja: "バトル中の補正。1段階ごとに1.5倍、2倍…と変わる。",
    },
    body: {
      en: [
        "Stat stages are the temporary +N/-N changes battles use. One stage up multiplies the stat by 1.5, two stages by 2; one stage down divides it by 1.5. Stages run from -6 to +6.",
        "Intimidate's -1 Attack and Icy Wind's -1 Speed are stages — which is why the calculator's boost boxes change damage so much more than a small number suggests.",
      ],
      ja: [
        "ランク補正は、バトル中の一時的な+N/-Nの変化です。1段階上がるとそのステータスは1.5倍、2段階で2倍になり、1段階下がると1/1.5になります。範囲は-6〜+6です。",
        "威嚇の攻撃-1やこごえるかぜの素早さ-1がランク補正です。計算機の補正ボックスが、小さな数字に見合わずダメージを大きく変えるのはこのためです。",
      ],
    },
    calcLink: "/calc",
  },
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
        "OHKOは1発で倒すこと（one-hit KO）。防御側のHPが1回の攻撃で0になります。2HKOは2発、3HKOは3発。技がどれに当てはまるかを知れば、自分のターン数がわかります。",
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
  {
    slug: "critical-hits",
    section: "concepts",
    long: false,
    title: { en: "Critical hits", ja: "急所" },
    summary: {
      en: "1.5× damage that ignores boosts and screens.",
      ja: "ランク補正と壁を無視する1.5倍ダメージ。",
    },
    body: {
      en: [
        "A critical hit multiplies damage by 1.5, and it lands with the boosts ignored: the attacker fights through its own Attack drops, the defender loses its Defence boosts and screens.",
        "That is why a crit can one-hit a Pokémon that looked safe behind Reflect and a +2 Defence. High-crit-ratio moves like Stone Edge and the Scope Lens item make it a plan rather than an accident.",
      ],
      ja: [
        "急所に当たるとダメージが1.5倍になり、ランク補正は無視されます。攻撃側の攻撃下降も、防御側の防御上昇や壁も関係しません。",
        "だからリフレクターと防御+2の裏が安全に見えたポケモンが、急所1発で落ちることがあります。急所率の高い技やピントレンズは、偶然を計画に変えます。",
      ],
    },
    calcLink: "/calc",
  },
  {
    slug: "damage-abilities",
    section: "concepts",
    long: false,
    title: { en: "Abilities that change damage", ja: "ダメージを変える特性" },
    summary: {
      en: "Thick Fat, Levitate, Huge Power — the abilities to calc around.",
      ja: "計算前に把握すべき、ダメージを書き換える特性。",
    },
    body: {
      en: [
        "Some abilities rewrite damage before a move lands. Thick Fat halves the offensive stat of Fire and Ice moves against its holder; Levitate and Flash Fire make their holders immune to Ground and Fire moves; Huge Power doubles the Attack stat of every physical hit.",
        "Team abilities matter too: Friend Guard cuts damage to its ally by 0.75×, and Intimidate lowers Attack before the first hit is ever thrown. Always set the right ability in the calculator — the same set with the wrong ability calcs a different game.",
      ],
      ja: [
        "技が当たる前にダメージを書き換える特性があります。あついしっぼは相手の炎技・氷技の攻撃値を半分にし、ふゆうともらいびはそれぞれじめん技とほのお技を無効にします。ちからもち物理技の攻撃値を2倍にします。",
        "味方側の特性も重要です。フレンドガードは味方が受けるダメージを0.75倍にし、威嚇は1回目の攻撃の前に攻撃を下げます。計算機では必ず正しい特性を選んでください。同じ型でも特性が違えば、別のゲームが計算されます。",
      ],
    },
    calcLink: "/calc",
  },
  {
    slug: "weather-wars",
    section: "concepts",
    long: false,
    title: { en: "Weather and terrain wars", ja: "天候・フィールドの奪い合い" },
    summary: {
      en: "Only one weather and one terrain fit on the field — the last one set wins.",
      ja: "天候もフィールドも1つだけ。最後に置いた側が取る。",
    },
    body: {
      en: [
        "The field holds one weather and one terrain at a time. Setting a weather while a different one is up replaces it — a weather move only fails when its own weather is already active — so whichever side sets last controls the field.",
        "Abilities fight the war on a switch-in budget: Drought, Drizzle, Sand Stream and Snow Warning summon their weather every time the holder enters, and the Surge abilities do the same for terrain. Re-entering a setter repeats it without spending a move slot.",
      ],
      ja: [
        "場に置ける天候とフィールドは各1つです。別の天候が上がっている状態で新しく技を使うと、入れ替わります（同じ天候のときだけ失敗します）。最後に置いた側が場を支配します。",
        "特性は登場という形で戦争に参加します。ひでり・あめふらし・すなおこし・ゆきふらしは持ち主が場に出るたびに天候を呼び、各種メイカー系特性はフィールドを呼びます。再び場に出すだけで、技を使わずに天候やフィールドを置き直せます。",
      ],
    },
    calcLink: "/calc",
  },
  {
    slug: "mega-evolution",
    section: "concepts",
    long: false,
    title: { en: "Mega Evolution", ja: "メガシンカ" },
    summary: {
      en: "One Pokémon per battle transforms through its held Mega Stone.",
      ja: "1試合に1回、メガストーンでフォルムを変える。",
    },
    body: {
      en: [
        "A Pokémon holding its own Mega Stone can Mega Evolve in battle: it takes on a forme with different stats, often a different type and ability — Garchomp-Mega jumps from 130 to 170 Attack and swaps Rough Skin for Sand Force. Mega formes are battle-only: you pick the base species with the stone, never the Mega as a team member.",
        "In Champions you can use Mega Evolution once per battle. It is a decision, not a habit: choose the moment the forme change actually wins, and remember the item slot it costs.",
      ],
      ja: [
        "自分のメガストーンを持ったポケモンは、バトル中にメガシンカできます。種族値が変わり、タイプや特性も変わることがあります。たとえばメガガブリアスは攻撃が130から170になり、特性がさめはだからすなのちからになります。メガフォルムはバトル専用です。チームには元の種族にストーンを持たせる形で登録し、メガシンカした姿を直接選ぶことはありません。",
        "チャンピオンズでは1試合に1回しかメガシンカできません。毎試合の習慣ではなく1つの決断です。変身することで実際に勝てる場面を選び、持ち物1つを失うコストも忘れずに。",
      ],
    },
    calcLink: "/calc",
  },
];
