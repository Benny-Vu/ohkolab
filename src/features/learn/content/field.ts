/**
 * The Field conditions section: weather, terrain, screens and the other
 * field effects. Long entries (Tailwind, Trick Room) get their own guide
 * pages; the rest show their full text on the section page.
 *
 * Every number here is checked against the game as the app models it
 * (`@smogon/calc` generation 0, `@pkmn/dex`) — see content.test.ts. The
 * primal weathers are left out on purpose: Desolate Land, Primordial Sea
 * and Delta Stream do not exist in Champions (neither do their holders).
 *
 * Owned by the learn-content stream — the lead owns the registry types
 * (`@/features/learn/guides`).
 */
import type { LearnEntry } from "@/features/learn/guides";

export const fieldEntries: readonly LearnEntry[] = [
  {
    slug: "tailwind",
    section: "field",
    long: true,
    title: { en: "Tailwind", ja: "追い風" },
    summary: {
      en: "Doubles your side's Speed for four turns.",
      ja: "4ターンのあいだ、味方の素早さが2倍になる。",
    },
    body: {
      en: [
        "Tailwind doubles the Speed stat of every Pokémon on your side for four turns. One turn of setup buys four turns of moving first — usually the best value in doubles speed control.",
        "Doubling Speed also decides every speed tie on your side, and a Choice Scarf on top of Tailwind stacks the two multipliers. Against a Trick Room team the same doubled Speed works against you: reversed order sends your fast side to the back.",
        "Count the turns. Tailwind expires after four turns, and knowing exactly which turn it expires on is what battle mode's speed list is for.",
      ],
      ja: [
        "追い風は4ターンのあいだ、味方全員の素早さの値を2倍にします。1ターンの準備で4ターン先に動ける権利を買う、ダブルの素早さ操作では最も効率の良い技です。",
        "素早さ2倍は味方側の同速をすべて自分に傾けます。拘りスカーフは追い風と重ねがけできます。ただしトリックルーム構築相手では、この2倍が裏目に出ます。順番が逆転して、速い自分が後回しになります。",
        "ターン数も数えましょう。追い風は4ターンで切れます。何ターン目に切れるかを確認するのが、バトルモードの素早さリストの役目です。",
      ],
    },
    calcLink: "/calc/battle",
  },
  {
    slug: "trick-room",
    section: "field",
    long: true,
    title: { en: "Trick Room", ja: "トリックルーム" },
    summary: {
      en: "For five turns, the slower Pokémon moves first.",
      ja: "5ターンのあいだ、遅いポケモンが先に動く。",
    },
    body: {
      en: [
        "Trick Room reverses turn order for five turns: the slowest Pokémon acts first. The move itself has priority -7, so it goes last on the turn it is cast — and casting it again while it is up ends the effect.",
        "A Trick Room team is built upside down: slow, hard-hitting Pokémon with Speed points spent anywhere but Speed. Under the room they act first for five turns, and the opponent's speed control works in reverse.",
        "Equal Speeds stay a coin flip under Trick Room, and anything that drops the opponent's Speed — Icy Wind, Thunder Wave — speeds them up in the reversed order. Protect is the classic answer while the turns run out.",
      ],
      ja: [
        "トリックルームは5ターンのあいだ、行動順を逆転させます。最も遅いポケモンが先に動きます。技自体の優先度は-7なので、使ったターンは最後に行動します。効果中に再び使うと、効果を打ち消します。",
        "トリックルーム構築は逆さまに作ります。遅くて火力の高いポケモンに、素早さ以外へステータスポイント（SP）を振る構成です。発動中の5ターンは先手を取り、相手の素早さ操作は意味が逆転します。",
        "逆転しても同速はコインフリップのままです。こごえるかぜやでんじはで相手の素早さを下げると、逆転ルールでは逆に「速く」なります。効果ターンの消化にはまもるが定番です。",
      ],
    },
    calcLink: "/calc/battle",
  },
  {
    slug: "sun",
    section: "field",
    long: false,
    title: { en: "Sun", ja: "晴れ" },
    summary: {
      en: "Fire moves hit 1.5×, Water moves 0.5×.",
      ja: "炎技1.5倍、水技0.5倍になる天候。",
    },
    body: {
      en: [
        "Sun multiplies Fire-type attack damage by 1.5 and Water-type attack damage by 0.5. Sunny Day sets it for five turns, eight while holding Heat Rock.",
        "Drought summons it whenever its holder enters the field, and Chlorophyll doubles Speed in sun. A different weather set later replaces it.",
      ],
      ja: [
        "晴れのあいだ、ほのお技のダメージは1.5倍、みず技は0.5倍になります。にほんばれで5ターン（あついいわ所持中は8ターン）続きます。",
        "ひでりは持ち主が場に出るたびに晴れを呼びます。ようりょくそは晴れのあいだ素早さが2倍になります。後から別の天候を置くと、晴れは入れ替わります。",
      ],
    },
  },
  {
    slug: "rain",
    section: "field",
    long: false,
    title: { en: "Rain", ja: "雨" },
    summary: {
      en: "Water moves hit 1.5×, Fire moves 0.5×.",
      ja: "水技1.5倍、炎技0.5倍になる天候。",
    },
    body: {
      en: [
        "Rain multiplies Water-type attack damage by 1.5 and Fire-type attack damage by 0.5. Rain Dance sets it for five turns, eight while holding Damp Rock.",
        "Drizzle summons it whenever its holder enters the field, and Swift Swim doubles Speed in rain.",
      ],
      ja: [
        "雨のあいだ、みず技のダメージは1.5倍、ほのお技は0.5倍になります。あまごいで5ターン（しめったいわ所持中は8ターン）続きます。",
        "あめふらしは持ち主が場に出るたびに雨を呼びます。すいすいは雨のあいだ素早さが2倍になります。",
      ],
    },
  },
  {
    slug: "sandstorm",
    section: "field",
    long: false,
    title: { en: "Sandstorm", ja: "砂嵐" },
    summary: {
      en: "Rock: 1.5× Special Defence; everyone else takes chip.",
      ja: "いわタイプの特防1.5倍。他は毎ターン削れる天候。",
    },
    body: {
      en: [
        "In sandstorm, Rock-type Pokémon take special attacks with 1.5× Special Defence, and every other active Pokémon loses 1/16 of its max HP at the end of each turn — Ground, Rock and Steel types are exempt, as are a few abilities such as Sand Rush.",
        "The Sandstorm move sets it for five turns, eight while holding Smooth Rock, and Sand Stream summons it whenever its holder enters the field. Sand Rush doubles Speed in sand.",
      ],
      ja: [
        "砂嵐のあいだ、いわタイプはとくこう技を特防1.5倍で受けます。それ以外のポケモンは毎ターン最大HPの1/16を失います（じめん・いわ・はがねタイプと、すなかきなどの一部の特性は対象外）。",
        "すなあらしで5ターン（さらさらいわ所持中は8ターン）続きます。すなおこしは持ち主が場に出るたびに砂嵐を呼びます。すなかきは砂嵐のあいだ素早さが2倍になります。",
      ],
    },
  },
  {
    slug: "snow",
    section: "field",
    long: false,
    title: { en: "Snow", ja: "雪" },
    summary: {
      en: "Ice: 1.5× Defence while it falls.",
      ja: "こおりタイプの防御1.5倍になる天候。",
    },
    body: {
      en: [
        "In snow, Ice-type Pokémon take physical attacks with 1.5× Defence. Snowscape sets it for five turns, eight while holding Icy Rock, and Snow Warning summons it whenever its holder enters the field.",
        "Snow also unlocks Aurora Veil — the screen that protects against both damage categories can only be set while it is snowing. Slush Rush doubles Speed in snow.",
      ],
      ja: [
        "雪のあいだ、こおりタイプは物理技を防御1.5倍で受けます。ゆきげしきで5ターン（つめたいいわ所持中は8ターン）続きます。ゆきふらしは持ち主が場に出るたびに雪を呼びます。",
        "雪はオーロラベールの条件でもあります。物理・特殊の両方を防ぐあの壁は、雪が降っているときしか使えません。ゆきかきは雪のあいだ素早さが2倍になります。",
      ],
    },
  },
  {
    slug: "electric-terrain",
    section: "field",
    long: false,
    title: { en: "Electric Terrain", ja: "エレキフィールド" },
    summary: {
      en: "Grounded: Electric 1.3×, cannot fall asleep.",
      ja: "接地中は電気1.3倍、眠り無効のフィールド。",
    },
    body: {
      en: [
        "For five turns, grounded Pokémon get the terrain: their Electric-type attacks do 1.3× damage and they cannot fall asleep. Electric Terrain lasts eight turns if the setter holds Terrain Extender.",
        "Electric Surge summons it whenever its holder enters the field. Flying types are not grounded, so the sleep block and the boost both pass them by.",
      ],
      ja: [
        "5ターンのあいだ、接地しているポケモンが効果を得ます。でんき技のダメージが1.3倍になり、眠りにつけなくなります。発動役がグランドコートを持っていれば8ターンまで伸びます。",
        "エレキメイカーは持ち主が場に出るたびにエレキフィールドを呼びます。ひこうタイプは接地していないため、眠り防止も威力アップも受けません。",
      ],
    },
  },
  {
    slug: "grassy-terrain",
    section: "field",
    long: false,
    title: { en: "Grassy Terrain", ja: "グラスフィールド" },
    summary: {
      en: "Grounded: Grass 1.3×, heals 1/16 each turn.",
      ja: "接地中は草1.3倍、毎ターン1/16回復のフィールド。",
    },
    body: {
      en: [
        "For five turns, grounded Pokémon get the terrain: their Grass-type attacks do 1.3× damage, and they recover 1/16 of their max HP at the end of each turn. Bulldoze, Earthquake and Magnitude do 0.5× damage against grounded targets while it lasts.",
        "Grassy Surge summons it whenever its holder enters the field, and Terrain Extender stretches it to eight turns.",
      ],
      ja: [
        "5ターンのあいだ、接地しているポケモンが効果を得ます。くさ技のダメージが1.3倍になり、毎ターン最大HPの1/16を回復します。発動中は、接地した相手に使うじならし・じしん・マグニチュードのダメージが0.5倍になります。",
        "グラスメイカーは持ち主が場に出るたびにグラスフィールドを呼びます。グランドコート所持中は8ターンまで伸びます。",
      ],
    },
  },
  {
    slug: "psychic-terrain",
    section: "field",
    long: false,
    title: { en: "Psychic Terrain", ja: "サイコフィールド" },
    summary: {
      en: "Grounded: Psychic 1.3×, immune to priority.",
      ja: "接地中はエスパー1.3倍、先制技を防ぐフィールド。",
    },
    body: {
      en: [
        "For five turns, grounded Pokémon get the terrain: their Psychic-type attacks do 1.3× damage, and they cannot be hit by priority moves at all — Fake Out, Aqua Jet and friends stop working against them.",
        "Psychic Surge summons it whenever its holder enters the field, and Terrain Extender stretches it to eight turns.",
      ],
      ja: [
        "5ターンのあいだ、接地しているポケモンが効果を得ます。エスパー技のダメージが1.3倍になり、先制技の攻撃対象にならなくなります。ねこだましもアクアジェットも効きません。",
        "サイコメイカーは持ち主が場に出るたびにサイコフィールドを呼びます。グランドコート所持中は8ターンまで伸びます。",
      ],
    },
  },
  {
    slug: "misty-terrain",
    section: "field",
    long: false,
    title: { en: "Misty Terrain", ja: "ミストフィールド" },
    summary: {
      en: "Grounded: cannot be statused; halves Dragon into them.",
      ja: "接地中は状態異常無効、ドラゴン技半減のフィールド。",
    },
    body: {
      en: [
        "For five turns, grounded Pokémon cannot be inflicted with a status condition or confusion, and Dragon-type attacks used against them do 0.5× damage. Misty Terrain lasts eight turns with Terrain Extender.",
        "In Champions the move is the only way to set it: the Misty Surge ability is not in the game.",
      ],
      ja: [
        "5ターンのあいだ、接地しているポケモンは状態異常と混乱を受けず、相手のドラゴン技のダメージが0.5倍になります。グランドコート所持中は8ターンまで伸びます。",
        "チャンピオンズでは技でしか置けません。ミストメイカーという特性は本作に存在しません。",
      ],
    },
  },
  {
    slug: "reflect",
    section: "field",
    long: false,
    title: { en: "Reflect", ja: "リフレクター" },
    summary: {
      en: "Physical damage to your side is cut for five turns.",
      ja: "5ターン、物理ダメージを減らす壁。",
    },
    body: {
      en: [
        "For five turns, your side takes 0.5× damage from physical attacks — 0.66× in doubles, where the screen is weaker. Light Clay stretches it to eight turns.",
        "Critical hits ignore the screen entirely, and stacking Reflect on Aurora Veil adds nothing — the two do not combine. Light Screen is the same wall against special attacks, and the two screens can be up at once.",
      ],
      ja: [
        "5ターンのあいだ、味方は物理技のダメージを0.5倍で受けます。ダブルでは効果が弱まり0.66倍になります。ひかりのねんどで8ターンまで伸びます。",
        "急所は壁を完全に無視します。また、リフレクターとオーロラベールは重ねても意味がありません。ひかりのかべは特殊技向けの同じ壁で、2枚の壁は同時に貼れます。",
      ],
    },
  },
  {
    slug: "light-screen",
    section: "field",
    long: false,
    title: { en: "Light Screen", ja: "ひかりのかべ" },
    summary: {
      en: "Special damage to your side is cut for five turns.",
      ja: "5ターン、特殊ダメージを減らす壁。",
    },
    body: {
      en: [
        "For five turns, your side takes 0.5× damage from special attacks — 0.66× in doubles, where the screen is weaker. Light Clay stretches it to eight turns.",
        "Critical hits ignore the screen entirely, and stacking Light Screen on Aurora Veil adds nothing. Reflect is the same wall against physical attacks, and the two screens can be up at once.",
      ],
      ja: [
        "5ターンのあいだ、味方は特殊技のダメージを0.5倍で受けます。ダブルでは効果が弱まり0.66倍になります。ひかりのねんどで8ターンまで伸びます。",
        "急所は壁を完全に無視します。また、ひかりのかべとオーロラベールは重ねても意味がありません。リフレクターは物理技向けの同じ壁で、2枚の壁は同時に貼れます。",
      ],
    },
  },
  {
    slug: "aurora-veil",
    section: "field",
    long: false,
    title: { en: "Aurora Veil", ja: "オーロラベール" },
    summary: {
      en: "Both screens in one move — but only while it snows.",
      ja: "2枚の壁を一度に。ただし雪のときだけ。",
    },
    body: {
      en: [
        "For five turns, your side takes reduced damage from both physical and special attacks — 0.5× each, or 0.66× in doubles. It fails unless the weather is snow, and Light Clay stretches it to eight turns.",
        "It does not stack with Reflect or Light Screen — the stronger single wall replaces the question — and critical hits ignore it like any screen.",
      ],
      ja: [
        "5ターンのあいだ、味方は物理・特殊どちらの技のダメージも0.5倍で受けます。ダブルでは0.66倍です。天候が雪のときしか成功せず、ひかりのねんどで8ターンまで伸びます。",
        "リフレクター・ひかりのかべとは重ねられず、急所は他の壁と同じく完全に無視します。",
      ],
    },
  },
  {
    slug: "gravity",
    section: "field",
    long: false,
    title: { en: "Gravity", ja: "じゅうりょく" },
    summary: {
      en: "Five turns: everything is grounded, moves miss less.",
      ja: "5ターン、全ポケモンが接地し、命中率が上がる。",
    },
    body: {
      en: [
        "For five turns, every Pokémon is grounded: Flying types and Levitate holders can be hit by Ground moves and are no longer airborne, and moves like Fly and Bounce cannot be used.",
        "Evasiveness drops to 0.6 for all active Pokémon, so low-accuracy moves land more often. Grounded also means the terrain effects apply to everyone.",
      ],
      ja: [
        "5ターンのあいだ、すべてのポケモンが接地します。ひこうタイプやふゆう持ちもじめん技が当たり、そらをとぶやとびはねるは使えなくなります。",
        "回避率は全ポケモン0.6倍になるため、命中率の低い技も通りやすくなります。接地するということは、フィールド効果が全員にかかるということでもあります。",
      ],
    },
  },
  {
    slug: "wonder-room",
    section: "field",
    long: false,
    title: { en: "Wonder Room", ja: "ワンダールーム" },
    summary: {
      en: "Five turns with Defence and Special Defence swapped.",
      ja: "5ターン、防御と特防が入れ替わる。",
    },
    body: {
      en: [
        "For five turns, every active Pokémon's Defence and Special Defence stats are swapped — physical walls take special attacks with the wrong wall up, and vice versa. Stat stages are unaffected.",
        "Casting Wonder Room again while it is up ends the effect early.",
      ],
      ja: [
        "5ターンのあいだ、場の全ポケモンの防御と特防が入れ替わります。物理受けが特殊技を低い値で受けるようになります（ランク補正は影響を受けません）。",
        "効果中に再び使うと、効果を打ち消します。",
      ],
    },
  },
  {
    slug: "magic-room",
    section: "field",
    long: false,
    title: { en: "Magic Room", ja: "マジックルーム" },
    summary: {
      en: "Five turns with every held item switched off.",
      ja: "5ターン、すべての持ち物が無効になる。",
    },
    body: {
      en: [
        "For five turns, the held items of all active Pokémon have no effect — Choice items, Life Orb, Focus Sash, all of it. A Mega Stone keeps its holder transformed, but its other effects are negated.",
        "Casting Magic Room again while it is up ends the effect early. It evens out item-heavy teams against item-light ones for as long as it lasts.",
      ],
      ja: [
        "5ターンのあいだ、場の全ポケモンの持ち物が無効になります。こだわり系、いのちのたま、きあいのタスキ、すべてです。メガストーンのメガシンカは維持されますが、それ以外の効果は無効になります。",
        "効果中に再び使うと、効果を打ち消します。持ち物に頼る構築とそうでない構築の差を、効果中だけ埋める技です。",
      ],
    },
  },
  {
    slug: "safeguard",
    section: "field",
    long: false,
    title: { en: "Safeguard", ja: "しんぴのまもり" },
    summary: {
      en: "Five turns where your party cannot be statused by others.",
      ja: "5ターン、相手からの状態異常を防ぐ。",
    },
    body: {
      en: [
        "For five turns, your side cannot be inflicted with a status condition or confusion by other Pokémon — blocking Sleep Powder, Thunder Wave and the like from the opposing side.",
        "It stops new status only; a Pokémon that is already burned or paralyzed stays that way.",
      ],
      ja: [
        "5ターンのあいだ、味方は他のポケモンから状態異常と混乱を受けなくなります。相手のねむりごなやでんじはなどを防ぎます。",
        "防ぐのは新しい状態異常だけです。すでにやけどやまひになっているポケモンは治りません。",
      ],
    },
  },
  {
    slug: "wide-guard",
    section: "field",
    long: false,
    title: { en: "Wide Guard", ja: "ワイドガード" },
    summary: {
      en: "Priority +3: shields your side from spread moves this turn.",
      ja: "優先度+3で、そのターン全体技から味方を守る。",
    },
    body: {
      en: [
        "Wide Guard is priority +3 and protects the user and its allies for the turn from moves that target multiple Pokémon — Earthquake, Rock Slide, Icy Wind and other spread attacks.",
        "It shares Protect's success rule: it works the first time and gets less reliable the more protection moves are used in a row.",
      ],
      ja: [
        "ワイドガードは優先度+3で、そのターンの間、自分と味方を複数体を狙う技から守ります。じしん、岩石封じ、こごえるかぜなどの全体技が対象です。",
        "まもる系の成功率ルールを共有します。初回は成功し、連続して守り技を使うほど成功率が下がります。",
      ],
    },
  },
  {
    slug: "quick-guard",
    section: "field",
    long: false,
    title: { en: "Quick Guard", ja: "クイックガード" },
    summary: {
      en: "Priority +3: shields your side from priority moves this turn.",
      ja: "優先度+3で、そのターン先制技から味方を守る。",
    },
    body: {
      en: [
        "Quick Guard is priority +3 and protects the user and its allies for the turn from other Pokémon's priority moves — Fake Out, Aqua Jet, Sucker Punch.",
        "It shares Protect's success rule: it works the first time and gets less reliable the more protection moves are used in a row.",
      ],
      ja: [
        "クイックガードは優先度+3で、そのターンの間、自分と味方を他のポケモンの先制技から守ります。ねこだまし、アクアジェット、ふいうちなどが対象です。",
        "まもる系の成功率ルールを共有します。初回は成功し、連続して守り技を使うほど成功率が下がります。",
      ],
    },
  },
  {
    slug: "entry-hazards",
    section: "field",
    long: false,
    title: { en: "Entry hazards", ja: "設置技（まきびし系）" },
    summary: {
      en: "Traps that punish every switch-in — rare in doubles.",
      ja: "交代してくる相手を削る設置物。ダブルでは珍しい。",
    },
    body: {
      en: [
        "Hazards sit on a side of the field and trigger on switch-in. Stealth Rock damages every switcher based on its Rock matchup — from 1/32 of max HP at 0.25× up to 1/2 at 4×. Spikes (up to three layers, grounded only) chip 1/8 to 1/4, Toxic Spikes (two layers) poison the grounded, and Sticky Web lowers the grounded newcomer's Speed by one.",
        "Rapid Spin, Mortal Spin, Defog and Tidy Up remove them. Doubles switches rarely enough that hazards see little play — but a long game behind hazards is a slow loss.",
      ],
      ja: [
        "設置技は相手の場に置き、出てきたポケモンに発動します。ステルスロックはいわ相性に応じて最大HPの1/32（0.25倍）から1/2（4倍）まで削ります。まきびし（最大3枚、接地限定）は1/8〜1/4、どくびし（2枚）は接地ポケモンを毒にし、ねばねばネットは接地ポケモンの素早さを1段階下げます。",
        "こうそくスピン、キラースピン、きりばらい、おかたづけで除去できます。ダブルは交代が少ないため設置技はほとんど使われませんが、長期戦では設置技があるぶんじわじわ負けます。",
      ],
    },
  },
];
