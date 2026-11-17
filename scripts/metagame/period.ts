// Period helpers. A period is a "YYYY-MM" string naming the month the
// battles were played.

const PERIOD_PATTERN = /^(\d{4})-(\d{2})$/;

const MONTH_NAMES = [
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
];

export function isPeriod(value: string): boolean {
  const match = PERIOD_PATTERN.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

/** "2026-10" -> "October 2026", for the attribution line. */
export function formatPeriodLabel(period: string): string {
  const match = PERIOD_PATTERN.exec(period);
  if (!match) return period;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return period;
  return `${MONTH_NAMES[month - 1]} ${match[1]}`;
}

export function formatPeriod(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The month before the given date, in UTC. */
export function previousPeriod(now: Date): string {
  const previous = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  return formatPeriod(previous);
}

/** Reads a "--period YYYY-MM" argument. Returns undefined when absent. */
export function parsePeriodArg(args: string[]): string | undefined {
  const index = args.indexOf("--period");
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || !isPeriod(value)) {
    throw new Error(
      `Invalid --period value: ${value ?? "(missing)"}. Expected YYYY-MM.`,
    );
  }
  return value;
}
