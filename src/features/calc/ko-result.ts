import type { KoLabelResult } from "@/components/ko-label";
import type { Translate } from "@/features/calc/stat-labels";

/**
 * Localizes the calculator's own fallback summaries ("Not a KO", ...). KO
 * text from the calc library ("guaranteed 2HKO", ...) is data-derived and
 * passes through unchanged.
 */
export function summaryText(summary: string, t: Translate): string {
  switch (summary) {
    case "Not a KO":
      return t("calc.summaryNotAKo");
    case "No effect":
      return t("calc.summaryNoEffect");
    case "Status move":
      return t("calc.summaryStatusMove");
    case "Cannot be calculated":
      return t("calc.summaryCannotCalc");
    default:
      return summary;
  }
}

/**
 * Turns the calc library's KO text into a label for `KoLabel`. Returns null
 * when the text is not a plain KO summary ("not a KO", chance-based text,
 * multi-turn approximations), so the caller can show the raw text instead.
 */
export function koResultOf(koText: string | undefined): KoLabelResult | null {
  if (!koText) return null;
  const text = koText.replace(/^approx\. /, "");

  if (/guaranteed OHKO/i.test(text)) return "OHKO";
  if (/guaranteed 2HKO/i.test(text)) return "GUARANTEED 2HKO";
  const guaranteed = /^guaranteed (?:O|(\d))HKO/i.exec(text);
  if (guaranteed) return nHko(turnsOf(guaranteed[1]));

  const chance = /^(\d+(?:\.\d+)?)% chance to (?:O|(\d))HKO/i.exec(text);
  if (chance) return nHko(turnsOf(chance[2]));

  const chanceTurns = /^(\d+(?:\.\d+)?)% chance to KO in (\d+) turns/i.exec(
    text,
  );
  if (chanceTurns) return nHko(Number(chanceTurns[2]));

  const possible = /^possible (?:O|(\d))HKO/i.exec(text);
  if (possible) return nHko(turnsOf(possible[1]));

  const possibleTurns = /^possible KO in (\d+) turns/i.exec(text);
  if (possibleTurns) return nHko(Number(possibleTurns[1]));

  const plain = /^(?:O|(\d))HKO/i.exec(text);
  if (plain) return nHko(turnsOf(plain[1]));

  const turns = /^KO in (\d+) turns/i.exec(text);
  if (turns) return nHko(Number(turns[1]));

  return null;
}

/** The calc library writes "OHKO" for one turn and "NHKO" for the rest. */
function turnsOf(digits: string | undefined): number {
  return digits === undefined || digits === "" ? 1 : Number(digits);
}

function nHko(turns: number): KoLabelResult | null {
  if (turns === 1) return "OHKO";
  if (turns === 2) return "2HKO";
  if (turns === 3) return "3HKO";
  if (turns === 4) return "4HKO";
  return null;
}
