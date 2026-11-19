import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/t";
import { formatPercent } from "@/lib/i18n/format";
import type { MetagameSnapshot } from "@/lib/metagame/types";

/** 0.234 → "23.4%"; null → "—". */
export function formatShare(share: number | null): string {
  if (share === null) return "—";
  return formatPercent(share);
}

/** "2026-10" → "October 2026" in English, "2026年10月" in Japanese; invalid periods pass through unchanged. */
export function formatPeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return period;
  return new Intl.DateTimeFormat(getLocale(), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(match[1]), month - 1, 1)));
}

/** 1649648 → "1,649,648", grouped the way the active locale groups. */
export function formatBattles(battles: number): string {
  return new Intl.NumberFormat(getLocale()).format(battles);
}

/**
 * Attribution line per the data-sources note, e.g.
 * "Pokémon Showdown ladder, October 2026, rating 1630+, via smogon.com/stats".
 * The rating and via-credit parts come from the dictionary, and the month
 * follows the active locale. Labels that already carry the period, rating
 * or via-credit (as generated snapshots do) are returned without repeating
 * those parts.
 */
export function formatAttribution(snapshot: MetagameSnapshot): string {
  const { label } = snapshot.source;
  const parts = [
    formatPeriod(snapshot.period),
    t("meta.ratingCutoff", { rating: snapshot.source.ratingCutoff }),
  ];
  if (snapshot.source.id === "showdown-ladder") {
    parts.push(t("meta.viaSmogon"));
  }
  return [label, ...parts.filter((part) => !label.includes(part))].join(", ");
}
