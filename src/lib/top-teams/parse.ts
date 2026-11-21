import { TYPE_NAMES } from "@/types/pokemon";
import type {
  TopTeam,
  TopTeamMember,
  TopTeamsFile,
} from "@/lib/top-teams/types";

const FORMAT_PATTERN = /^M-[A-Z]$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SOURCE_URL_PATTERN =
  /^https:\/\/play\.limitlesstcg\.com\/tournaments\/[A-Za-z0-9_-]+/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** A number that is a non-negative integer, the common shape here. */
function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isTypeOrEmpty(value: unknown): value is string | null {
  if (value === null) return true;
  return (
    typeof value === "string" &&
    (TYPE_NAMES as readonly string[]).includes(value)
  );
}

function isMember(value: unknown): value is TopTeamMember {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.species)) return false;
  if (value.item !== null && !isNonEmptyString(value.item)) return false;
  if (!isNonEmptyString(value.ability)) return false;
  if (!isNonEmptyString(value.nature)) return false;
  if (!isTypeOrEmpty(value.tera)) return false;
  if (!Array.isArray(value.moves)) return false;
  if (value.moves.length < 1 || value.moves.length > 4) return false;
  return value.moves.every(isNonEmptyString);
}

function isTeam(value: unknown): value is TopTeam {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.eventId)) return false;
  if (!isNonEmptyString(value.event)) return false;
  if (typeof value.date !== "string" || !DATE_PATTERN.test(value.date)) {
    return false;
  }
  if (typeof value.format !== "string" || !FORMAT_PATTERN.test(value.format)) {
    return false;
  }
  if (!isCount(value.players) || value.players < 32) return false;
  if (!isCount(value.placing) || value.placing < 1 || value.placing > 8) {
    return false;
  }
  const record = value.record;
  if (
    !isRecord(record) ||
    !isCount(record.wins) ||
    !isCount(record.losses) ||
    !isCount(record.ties)
  ) {
    return false;
  }
  if (
    typeof value.sourceUrl !== "string" ||
    !SOURCE_URL_PATTERN.test(value.sourceUrl)
  ) {
    return false;
  }
  if (!Array.isArray(value.members) || value.members.length !== 6) {
    return false;
  }
  return value.members.every(isMember);
}

/**
 * Validates a fetched top-teams file. Invalid teams are skipped with a
 * console warning (one bad team must not blank the view); a broken file
 * shape rejects the whole file. Newest-first order is the ingest
 * contract; the view sorts what it shows.
 */
export function parseTopTeamsFile(value: unknown): TopTeamsFile | null {
  if (!isRecord(value)) return null;
  if (value.source !== "limitless") return null;
  if (typeof value.generatedAt !== "string") return null;
  if (Number.isNaN(Date.parse(value.generatedAt))) return null;
  if (!Array.isArray(value.teams)) return null;
  const kept: TopTeam[] = [];
  for (const entry of value.teams) {
    if (isTeam(entry)) {
      kept.push(entry);
    } else {
      console.warn("top-teams: skipped invalid team entry");
    }
  }
  return { ...value, teams: kept } as unknown as TopTeamsFile;
}
