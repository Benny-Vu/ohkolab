import type { BattleFormat } from "@/types/battle";
import { STAT_IDS, type StatsTable } from "@/types/pokemon";
import type {
  MetagameIndex,
  MetagameSnapshot,
  PokemonUsage,
  Share,
  SpreadShare,
} from "@/lib/metagame/types";

const FORMATS: readonly BattleFormat[] = ["singles", "doubles"];
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isShare(value: unknown): value is Share {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    typeof value.share === "number" &&
    Number.isFinite(value.share) &&
    value.share >= 0 &&
    value.share <= 1
  );
}

function isStatPoints(value: unknown): value is StatsTable {
  if (!isRecord(value)) return false;
  return STAT_IDS.every((id) => {
    const stat = value[id];
    return (
      typeof stat === "number" &&
      Number.isInteger(stat) &&
      stat >= 0 &&
      stat <= 32
    );
  });
}

function isSpreadShare(value: unknown): value is SpreadShare {
  return (
    isRecord(value) &&
    isNonEmptyString(value.nature) &&
    isStatPoints(value.statPoints) &&
    typeof value.share === "number" &&
    Number.isFinite(value.share) &&
    value.share >= 0 &&
    value.share <= 1
  );
}

/** Keeps the valid share entries and warns about the dropped ones; null when
 * the value is not an array at all, which makes the pokemon invalid. */
function filterShareList(value: unknown): Share[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((entry) => {
    if (isShare(entry)) return true;
    console.warn(
      `metagame: dropped invalid share entry ${JSON.stringify(entry)}`,
    );
    return false;
  });
}

/** Keeps the valid spread entries and warns about the dropped ones; null when
 * the value is not an array at all, which makes the pokemon invalid. */
function filterSpreadList(value: unknown): SpreadShare[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((entry) => {
    if (isSpreadShare(entry)) return true;
    console.warn(
      `metagame: dropped invalid spread entry ${JSON.stringify(entry)}`,
    );
    return false;
  });
}

/** Parses one pokemon entry, dropping invalid list entries with a warning.
 * Returns null when the pokemon itself is invalid and must be skipped. */
function parsePokemonUsage(value: unknown): PokemonUsage | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.species)) return null;
  if (
    typeof value.rank !== "number" ||
    !Number.isInteger(value.rank) ||
    value.rank < 1
  ) {
    return null;
  }
  if (
    value.usage !== null &&
    (typeof value.usage !== "number" ||
      !Number.isFinite(value.usage) ||
      value.usage < 0 ||
      value.usage > 1)
  ) {
    return null;
  }
  const abilities = filterShareList(value.abilities);
  const items = filterShareList(value.items);
  const moves = filterShareList(value.moves);
  const natures = filterShareList(value.natures);
  const spreads = filterSpreadList(value.spreads);
  const teammates = filterShareList(value.teammates);
  if (
    abilities === null ||
    items === null ||
    moves === null ||
    natures === null ||
    spreads === null ||
    teammates === null
  ) {
    return null;
  }
  return {
    ...(value as unknown as PokemonUsage),
    abilities,
    items,
    moves,
    natures,
    spreads,
    teammates,
  };
}

function isSource(value: unknown): value is MetagameSnapshot["source"] {
  return (
    isRecord(value) &&
    value.id === "showdown-ladder" &&
    isNonEmptyString(value.label) &&
    isNonEmptyString(value.url) &&
    isNonEmptyString(value.formatId) &&
    typeof value.ratingCutoff === "number" &&
    Number.isFinite(value.ratingCutoff) &&
    value.ratingCutoff >= 0
  );
}

/**
 * Validates a fetched snapshot file against the metagame data contract.
 * File-level problems (format, period, source, ...) still reject the whole
 * file, but invalid pokemon entries are skipped and invalid list entries
 * are dropped with a console warning, so one bad entry no longer blanks
 * the whole metagame page. Extra properties are tolerated.
 */
export function parseMetagameSnapshot(value: unknown): MetagameSnapshot | null {
  if (!isRecord(value)) return null;
  if (FORMATS.every((format) => format !== value.format)) return null;
  if (!isNonEmptyString(value.regulation)) return null;
  if (typeof value.period !== "string" || !MONTH_PATTERN.test(value.period)) {
    return null;
  }
  if (
    typeof value.battles !== "number" ||
    !Number.isInteger(value.battles) ||
    value.battles < 0
  ) {
    return null;
  }
  if (typeof value.generatedAt !== "string" || !isIsoDate(value.generatedAt)) {
    return null;
  }
  if (!isSource(value.source)) return null;
  if (!Array.isArray(value.pokemon)) return null;
  const kept: PokemonUsage[] = [];
  for (const entry of value.pokemon) {
    const pokemon = parsePokemonUsage(entry);
    if (pokemon) {
      kept.push(pokemon);
    } else {
      console.warn("metagame: skipped invalid pokemon entry");
    }
  }
  for (let i = 0; i < kept.length; i += 1) {
    const current = kept[i];
    if (!current) return null;
    const previous = i > 0 ? kept[i - 1] : null;
    if (previous && current.rank <= previous.rank) return null;
  }
  return { ...value, pokemon: kept } as unknown as MetagameSnapshot;
}

/**
 * Validates a fetched index file. Returns null when anything does not fit;
 * extra properties are tolerated.
 */
export function parseMetagameIndex(value: unknown): MetagameIndex | null {
  if (!isRecord(value)) return null;
  if (!isRecord(value.latest)) return null;
  for (const format of FORMATS) {
    const path = value.latest[format];
    if (path !== undefined && !isNonEmptyString(path)) return null;
  }
  if (!Array.isArray(value.snapshots)) return null;
  for (const entry of value.snapshots) {
    if (!isRecord(entry)) return null;
    if (FORMATS.every((format) => format !== entry.format)) return null;
    if (typeof entry.period !== "string" || !MONTH_PATTERN.test(entry.period)) {
      return null;
    }
    if (!isNonEmptyString(entry.regulation)) return null;
    if (!isNonEmptyString(entry.path)) return null;
  }
  return value as unknown as MetagameIndex;
}

function isIsoDate(value: string): boolean {
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}
