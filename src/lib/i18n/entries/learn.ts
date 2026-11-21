/**
 * The learn dictionary: the page chrome for /learn and its section and
 * guide pages. The explainer content itself lives in the registry
 * (`@/features/learn/guides`), EN and JA inline; only `learn.title` and
 * the SEO description sit in the shell domain, because the footer link
 * and the browser tab render before this overlay loads. Owned by the
 * learn wave; the Japanese side must keep exactly the same keys (the
 * parity test enforces it).
 */

export const learnEn = {
  // The hub. The footer link and browser-tab title use the shell's
  // "footer.learn" twin of this label.
  "learn.title": "Learn",
  "learn.description": "Short guides to the numbers behind Champions battles.",

  // The live damage-rolls example.
  "learn.exampleTitle": "Example",
  "learn.exampleLine":
    "{move} from {attacker} into {defender}: {min}–{max} damage ({minPercent}–{maxPercent}% of its max HP).",
  "learn.exampleNote":
    "The striped band is the roll range: the same move into the same Pokémon, rolled sixteen ways.",

  // Section and guide page chrome.
  "learn.read": "Read",
  "learn.readGuide": "Read the {title} guide",
  "learn.inThisSection": "In this section",
  "learn.searchTerms": "Search terms",
  "learn.searchPlaceholder": "Search terms",
  "learn.tryInCalc": "Try it in the calc",
  "learn.openBattleMode": "Open battle mode",
  "learn.prevAria": "Previous guide: {title}",
  "learn.nextAria": "Next guide: {title}",
  "learn.countOne": "1 entry",
  "learn.countMany": "{count} entries",
  "learn.typeChart": "Type chart",

  // The Types page.
  "learn.types.attacking": "Attacking",
  "learn.types.defending": "Defending",
  "learn.types.superEffective": "Super effective against",
  "learn.types.notVeryEffective": "Not very effective against",
  "learn.types.noEffect": "No effect on",
  "learn.types.weakTo": "Weak to",
  "learn.types.resists": "Resists",
  "learn.types.immuneTo": "Immune to",
  "learn.types.traits": "Traits",
  "learn.types.chartGuide": "Rows attack, columns defend.",
  "learn.types.legendSuper": "Super effective",
  "learn.types.legendResist": "Not very effective",
  "learn.types.legendNoEffect": "No effect",
} as const;

export type LearnKey = keyof typeof learnEn;
