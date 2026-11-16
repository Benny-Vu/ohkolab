import { DEFAULT_TEAM_NAME } from "@/lib/team/team-ops";
import type { BattleFormat } from "@/types/battle";
import {
  STAT_IDS,
  emptyStatsTable,
  type Gender,
  type PokemonSet,
} from "@/types/pokemon";
import { MAX_TEAM_SIZE, type Team } from "@/types/team";

/**
 * Where teams are kept. The pages only ever talk to this interface (through
 * `useTeams`), so a cloud-backed store can replace the local one later.
 *
 * The interface is synchronous on purpose: `list` is a snapshot React can
 * read during render. A cloud store fits it by keeping a local cache, applying
 * writes to the cache at once, syncing in the background and calling its
 * subscribers when the server answers.
 */
export interface TeamStore {
  /**
   * Every saved team, in the order they were first saved. The array is the
   * same object until something changes, so it works as a React snapshot.
   */
  list(): readonly Team[];
  get(id: string): Team | undefined;
  /** Adds the team, or replaces the saved team with the same id. */
  save(team: Team): void;
  delete(id: string): void;
  /** Calls `listener` after every change. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

export const TEAMS_STORAGE_KEY = "ohkolab:teams";
/** Where unreadable data is parked before it is overwritten. */
export const TEAMS_BACKUP_KEY = "ohkolab:teams:backup";
export const TEAMS_STORAGE_VERSION = 1;

/** What is written under `TEAMS_STORAGE_KEY`, as JSON. */
interface StoredTeams {
  version: typeof TEAMS_STORAGE_VERSION;
  teams: Team[];
}

const FALLBACK_NATURE = "Hardy";
const FALLBACK_FORMAT: BattleFormat = "doubles";
const EPOCH = new Date(0).toISOString();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function isoDateOr(value: unknown, fallback: string): string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : fallback;
}

/**
 * Turns anything into a well-formed `PokemonSet`, or null when it has no
 * species. Only the shape is repaired here (types, four move slots, whole
 * non-negative Stat Points); whether the set is legal is `validateSet`'s job.
 */
export function sanitizeSet(value: unknown): PokemonSet | null {
  if (!isRecord(value)) return null;
  const species = stringOrNull(value.species);
  if (!species) return null;

  const statPoints = emptyStatsTable();
  if (isRecord(value.statPoints)) {
    for (const stat of STAT_IDS) {
      const points = value.statPoints[stat];
      if (typeof points === "number" && Number.isFinite(points)) {
        statPoints[stat] = Math.max(0, Math.trunc(points));
      }
    }
  }

  const rawMoves = Array.isArray(value.moves) ? value.moves : [];
  const moves: PokemonSet["moves"] = [
    stringOrNull(rawMoves[0]),
    stringOrNull(rawMoves[1]),
    stringOrNull(rawMoves[2]),
    stringOrNull(rawMoves[3]),
  ];

  const set: PokemonSet = {
    species,
    item: stringOrNull(value.item),
    ability: stringOrNull(value.ability),
    nature: stringOrNull(value.nature) ?? FALLBACK_NATURE,
    statPoints,
    moves,
  };
  const nickname = stringOrNull(value.nickname);
  if (nickname) set.nickname = nickname;
  if (value.gender === "M" || value.gender === "F" || value.gender === "N") {
    set.gender = value.gender satisfies Gender;
  }
  return set;
}

/** Turns anything into a well-formed `Team`, or null when it has no id. */
export function sanitizeTeam(value: unknown): Team | null {
  if (!isRecord(value)) return null;
  const id = stringOrNull(value.id);
  if (!id) return null;

  const members = (Array.isArray(value.members) ? value.members : [])
    .map(sanitizeSet)
    .filter((set): set is PokemonSet => set !== null)
    .slice(0, MAX_TEAM_SIZE);

  const createdAt = isoDateOr(
    value.createdAt,
    isoDateOr(value.updatedAt, EPOCH),
  );
  return {
    id,
    name: typeof value.name === "string" ? value.name : DEFAULT_TEAM_NAME,
    format:
      value.format === "singles" || value.format === "doubles"
        ? value.format
        : FALLBACK_FORMAT,
    members,
    createdAt,
    updatedAt: isoDateOr(value.updatedAt, createdAt),
  };
}

export interface ParsedTeams {
  teams: Team[];
  /**
   * True when the text was there but could not be understood as a whole (not
   * JSON, wrong shape, or written by a newer version of the app).
   */
  unreadable: boolean;
}

/**
 * Reads the stored JSON. Never throws: unreadable text gives no teams, and
 * inside a readable file each broken team or member is dropped on its own.
 */
export function parseStoredTeams(raw: string | null): ParsedTeams {
  if (raw === null) return { teams: [], unreadable: false };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { teams: [], unreadable: true };
  }
  if (
    !isRecord(data) ||
    data.version !== TEAMS_STORAGE_VERSION ||
    !Array.isArray(data.teams)
  ) {
    return { teams: [], unreadable: true };
  }

  const teams: Team[] = [];
  const seen = new Set<string>();
  for (const entry of data.teams) {
    const team = sanitizeTeam(entry);
    if (!team || seen.has(team.id)) continue;
    seen.add(team.id);
    teams.push(team);
  }
  return { teams, unreadable: false };
}

export function serializeTeams(teams: readonly Team[]): string {
  const stored: StoredTeams = {
    version: TEAMS_STORAGE_VERSION,
    teams: [...teams],
  };
  return JSON.stringify(stored);
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/**
 * A team store on top of web storage (the browser's `localStorage` unless
 * another one is passed, which the tests do).
 *
 * The storage is read again on every `list`, but parsed only when its text
 * changed, so teams saved in another tab show up and the snapshot stays
 * stable. When the storage cannot be used (private mode, quota), the teams
 * live in memory for the rest of the session.
 */
export function createLocalTeamStore(
  getStorage: () => StorageLike | undefined = () => globalThis.localStorage,
): TeamStore {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedTeams: readonly Team[] = [];
  /** Unreadable text found in storage, to back up before overwriting it. */
  let unreadableRaw: string | null = null;
  /** Set once a write failed: from then on memory is the source of truth. */
  let memoryOnly = false;

  function storage(): StorageLike | undefined {
    try {
      return getStorage();
    } catch {
      return undefined;
    }
  }

  function list(): readonly Team[] {
    if (memoryOnly) return cachedTeams;
    let raw: string | null;
    try {
      const target = storage();
      if (!target) return cachedTeams;
      raw = target.getItem(TEAMS_STORAGE_KEY);
    } catch {
      return cachedTeams;
    }
    if (raw !== cachedRaw) {
      const parsed = parseStoredTeams(raw);
      cachedRaw = raw;
      cachedTeams = parsed.teams;
      unreadableRaw = parsed.unreadable ? raw : null;
    }
    return cachedTeams;
  }

  function write(teams: readonly Team[]): void {
    const raw = serializeTeams(teams);
    try {
      const target = storage();
      if (!target) throw new Error("No storage");
      if (unreadableRaw !== null) {
        // Keep what could not be read, in case a newer version wrote it.
        target.setItem(TEAMS_BACKUP_KEY, unreadableRaw);
        unreadableRaw = null;
      }
      target.setItem(TEAMS_STORAGE_KEY, raw);
    } catch {
      memoryOnly = true;
    }
    cachedRaw = raw;
    cachedTeams = teams;
    for (const listener of listeners) listener();
  }

  function onStorageEvent(event: StorageEvent): void {
    if (event.key !== null && event.key !== TEAMS_STORAGE_KEY) return;
    for (const listener of listeners) listener();
  }

  return {
    list,
    get: (id) => list().find((team) => team.id === id),
    save(team) {
      const teams = list();
      const index = teams.findIndex((existing) => existing.id === team.id);
      write(
        index === -1
          ? [...teams, team]
          : teams.map((existing, position) =>
              position === index ? team : existing,
            ),
      );
    },
    delete(id) {
      const teams = list();
      if (!teams.some((team) => team.id === id)) return;
      write(teams.filter((team) => team.id !== id));
    },
    subscribe(listener) {
      if (listeners.size === 0 && typeof window !== "undefined") {
        window.addEventListener("storage", onStorageEvent);
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") {
          window.removeEventListener("storage", onStorageEvent);
        }
      };
    },
  };
}

/** The store the app uses: teams in this browser's local storage. */
export const localTeamStore: TeamStore = createLocalTeamStore();
