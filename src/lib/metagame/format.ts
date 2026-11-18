import type { MetagameSnapshot } from "@/lib/metagame/types";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** 0.234 → "23.4%"; null → "—". */
export function formatShare(share: number | null): string {
  if (share === null) return "—";
  return `${(share * 100).toFixed(1)}%`;
}

/** "2026-10" → "October 2026"; invalid periods pass through unchanged. */
export function formatPeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return period;
  return `${MONTHS[month - 1]} ${match[1]}`;
}

/** 1649648 → "1,649,648". */
export function formatBattles(battles: number): string {
  return battles.toLocaleString("en-US");
}

/** Attribution line per the data-sources note, e.g.
 * "Pokémon Showdown ladder, October 2026, rating 1630+, via smogon.com/stats".
 * Labels that already carry the period, rating or via-credit (as generated
 * snapshots do) are returned without repeating those parts. */
export function formatAttribution(snapshot: MetagameSnapshot): string {
  const { label } = snapshot.source;
  const parts = [
    formatPeriod(snapshot.period),
    `rating ${snapshot.source.ratingCutoff}+`,
  ];
  if (snapshot.source.id === "showdown-ladder") {
    parts.push("via smogon.com/stats");
  }
  return [label, ...parts.filter((part) => !label.includes(part))].join(", ");
}
