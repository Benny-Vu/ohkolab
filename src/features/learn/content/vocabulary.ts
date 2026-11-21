/**
 * The Vocabulary section: the A–Z glossary. Every term is a short entry —
 * its slug is also the deep-link anchor (`/learn/vocabulary#stab`) — and
 * it links to its guide when one exists (the page reads the `calcLink`
 * and same-section guides for that).
 *
 * Owned by the learn-content stream. Seed terms from the lead; the stream
 * expands to every term the concepts, field and types pages use, EN and JA.
 */
import type { LearnEntry } from "@/features/learn/guides";

export const vocabularyEntries: readonly LearnEntry[] = [
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
        "A move whose type matches one of the attacker's types gets a damage bonus.",
      ],
      ja: ["攻撃側のタイプと同じタイプの技は、ダメージにボーナスが乗ります。"],
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
];
