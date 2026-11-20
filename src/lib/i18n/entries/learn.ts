/**
 * The learn dictionary: the /learn explainers (damage rolls, OHKO and 2HKO,
 * Stat Points, speed ties). Only `learn.title` and the SEO description sit
 * in the shell domain, because the footer link and the browser tab render
 * before this overlay loads. Owned by the quality wave's learn stream; the
 * Japanese side must keep exactly the same keys (the parity test enforces
 * it).
 */

export const learnEn = {
  // The page frame. The footer link and browser-tab title use the shell's
  // "footer.learn" twin of this label.
  "learn.title": "Learn",
  "learn.description": "Short guides to the numbers behind Champions battles.",

  // Damage rolls.
  "learn.damageRolls.title": "Damage rolls",
  "learn.damageRolls.body1":
    "The same move does not do the same damage every time. Once the game has added up attack, defence and every field effect, it multiplies the total by a random factor between 85% and 100% — one of sixteen rolls. That is why the calculator shows a range instead of a single number.",
  "learn.damageRolls.body2":
    "The range is always about 15% of the damage, so it matters most when the defender's HP sits inside it: the low roll leaves it standing, the high roll does not.",
  "learn.exampleTitle": "Example",
  "learn.exampleLine":
    "{move} from {attacker} into {defender}: {min}–{max} damage ({minPercent}–{maxPercent}% of its max HP).",
  "learn.exampleNote":
    "The striped band is the roll range: the same move into the same Pokémon, rolled sixteen ways.",

  // OHKO and 2HKO.
  "learn.ohko.title": "OHKO and 2HKO",
  "learn.ohko.body1":
    "OHKO means one-hit KO: the defender loses all of its HP to a single hit. A 2HKO takes two hits, a 3HKO three. Know which one a move is and you know how many turns you have.",
  "learn.ohko.body2":
    "A KO is guaranteed when even the lowest roll finishes the job; it is only a chance when just the high rolls do. The calculator labels every result — OHKO, 2HKO, guaranteed 2HKO — so check the label before you count turns.",

  // Stat Points.
  "learn.statPoints.title": "Stat Points (SP)",
  "learn.statPoints.body1":
    "In Champions every Pokémon is level 50, and Stat Points — SP — replace the EVs and IVs of the main games. Each Pokémon gets 66 points, and one stat can take at most 32.",
  "learn.statPoints.body2":
    "66 points do not go far across six stats, so where they go is the heart of a build: two stats near the cap, or a thinner spread over more of them. The team builder and the calculator both show the budget while you spend it.",

  // Speed ties.
  "learn.speedTies.title": "Speed ties",
  "learn.speedTies.body1":
    "When both Pokémon have the same Speed stat, the game picks who moves first at random: a 50/50 coin flip, rolled again every turn. The calculator marks these matchups as a speed tie.",
  "learn.speedTies.body2":
    "Ties matter most when each side can knock the other out first — whoever wins the flip usually wins the trade. Anything that changes Speed (stat boosts, effects like Tailwind) breaks a tie, in either direction.",
} as const;

export type LearnKey = keyof typeof learnEn;
