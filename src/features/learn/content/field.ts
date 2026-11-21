/**
 * The Field conditions section: weather, terrain, screens and the other
 * field effects. Long entries (Tailwind, Trick Room) get their own guide
 * pages; the rest show their full text on the section page.
 *
 * Owned by the learn-content stream. Seed entries from the lead; the
 * stream adds every weather, every terrain and the important remaining
 * field conditions, EN and JA, with every number checked against
 * @smogon/calc (generation 0) and @pkmn/dex.
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
        "Tailwind doubles the Speed stat of every Pokémon on your side for four turns, counted from the turn it goes up.",
      ],
      ja: [
        "追い風は4ターンのあいだ、味方全員の素早さの値を2倍にします（発動したターンから数えます）。",
      ],
    },
    calcLink: "/calc",
  },
];
