import { toast } from "sonner";

import { describeError } from "@/lib/auth/errors";
import type { TeamInsert, TeamRow } from "@/lib/database.types";
import type { AppSupabaseClient } from "@/lib/supabase";
import { copyLocalTeamsToAccount } from "@/lib/team/copy-local-teams";
import { sanitizeTeam, type TeamStore } from "@/lib/team/team-store";
import type { Team } from "@/types/team";

/** Where the cloud sync is at. */
type CloudSyncStatus = "loading" | "ready" | "error";

export interface CloudSyncState {
  status: CloudSyncStatus;
  /** Friendly text when the teams could not be loaded. */
  message: string | null;
  /** Ids of teams whose latest change has not reached the server yet. */
  unsynced: readonly string[];
}

/** A `TeamStore` backed by the `teams` table, with its sync state surfaced. */
export interface CloudTeamStore extends TeamStore {
  /** The sync state as a stable snapshot, for `useSyncExternalStore`. */
  syncState(): CloudSyncState;
  /** Tries again: reloads after a failed load, re-flushes after a failed write. */
  retry(): void;
}

/** Maps a `teams` row to a `Team`; null when the row is unusable. */
export function rowToTeam(row: TeamRow): Team | null {
  const team = sanitizeTeam({
    id: row.id,
    name: row.name,
    format: row.format,
    members: row.data,
    // The check constraint means a stored ID is always well-formed; the
    // sanitizer only re-validated it.
    gameTeamId: row.game_team_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
  return team ? { ...team, isPublic: row.is_public } : null;
}

/** Maps a `Team` to the row upserted into the `teams` table. */
function teamToUpsert(team: Team): TeamInsert {
  return {
    id: team.id,
    name: team.name,
    data: team.members,
    format: team.format,
    is_public: team.isPublic ?? false,
    game_team_id: team.gameTeamId || null,
    created_at: team.createdAt,
    updated_at: new Date().toISOString(),
  };
}

export interface CloudTeamStoreOptions {
  /** Called once per failed write batch. Defaults to a toast with Retry. */
  onWriteError?: (retry: () => void) => void;
}

function defaultWriteError(retry: () => void): void {
  toast("Your team changes could not be saved.", {
    action: { label: "Retry", onClick: () => retry() },
  });
}

type PendingOp =
  | { kind: "save"; team: Team; payload: TeamInsert }
  | { kind: "delete"; id: string };

/**
 * A `TeamStore` on the signed-in user's `teams` rows. Reads come from an
 * in-memory cache filled once on creation; writes apply to the cache at once
 * and sync to the server in the background, one change at a time. A failed
 * write keeps the local change, marks the team unsynced and asks
 * `onWriteError` to surface a retry.
 */
export function createCloudTeamStore(
  client: AppSupabaseClient,
  userId: string,
  options: CloudTeamStoreOptions = {},
): CloudTeamStore {
  const onWriteError = options.onWriteError ?? defaultWriteError;

  const listeners = new Set<() => void>();
  /** The latest change per team id, flushed one at a time. */
  const queue = new Map<string, PendingOp>();
  const unsyncedIds = new Set<string>();

  let teams: Team[] = [];
  let status: CloudSyncStatus = "loading";
  let message: string | null = null;
  let syncSnapshot: CloudSyncState = { status, message, unsynced: [] };
  let loadInFlight = false;
  let flushInFlight = false;

  function notify(): void {
    for (const listener of [...listeners]) listener();
  }

  /** Rebuilds the sync snapshot; true when it changed. */
  function refreshSync(): boolean {
    const unsynced = [...unsyncedIds];
    const changed =
      syncSnapshot.status !== status ||
      syncSnapshot.message !== message ||
      syncSnapshot.unsynced.length !== unsynced.length ||
      syncSnapshot.unsynced.some((id, index) => id !== unsynced[index]);
    if (!changed) return false;
    syncSnapshot = { status, message, unsynced };
    return true;
  }

  function publish(): void {
    refreshSync();
    notify();
  }

  function pendingSaves(): Team[] {
    const saves: Team[] = [];
    for (const op of queue.values()) {
      if (op.kind === "save") saves.push(op.team);
    }
    return saves;
  }

  /** Folds the loaded rows, the copied teams and the queued changes together. */
  function mergeLoaded(loaded: readonly Team[], copied: readonly Team[]): void {
    const deleting = new Set<string>();
    for (const op of queue.values()) {
      if (op.kind === "delete") deleting.add(op.id);
    }
    const merged = new Map<string, Team>();
    for (const team of loaded) {
      if (!deleting.has(team.id)) merged.set(team.id, team);
    }
    for (const team of pendingSaves()) merged.set(team.id, team);
    for (const team of copied) merged.set(team.id, team);
    teams = [...merged.values()].sort(
      (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
  }

  async function load(): Promise<void> {
    if (loadInFlight) return;
    loadInFlight = true;
    status = "loading";
    message = null;
    publish();
    try {
      const { data, error } = await client
        .from("teams")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      const loaded = (data ?? [])
        .map(rowToTeam)
        .filter((team): team is Team => team !== null);
      let copied: Team[] = [];
      try {
        copied = await copyLocalTeamsToAccount(
          client,
          userId,
          new Set([...loaded, ...pendingSaves()].map((team) => team.id)),
        );
      } catch {
        // The copy retries on the next sign-in; the loaded teams still show.
      }
      mergeLoaded(loaded, copied);
      status = "ready";
      publish();
      scheduleFlush();
    } catch (error) {
      status = "error";
      message = describeError(error).message;
      publish();
    } finally {
      loadInFlight = false;
    }
  }

  async function upsertRow(payload: TeamInsert) {
    const { error } = await client.from("teams").upsert(payload);
    return error;
  }

  async function deleteRow(id: string) {
    const { error } = await client.from("teams").delete().eq("id", id);
    return error;
  }

  function scheduleFlush(): void {
    // Never flush while a load is in flight: its merge would drop queued
    // changes that are not in the loaded rows. `load()` re-schedules.
    if (loadInFlight || flushInFlight || queue.size === 0) return;
    flushInFlight = true;
    void (async () => {
      while (queue.size > 0) {
        const key = queue.keys().next().value;
        const op = key === undefined ? undefined : queue.get(key);
        if (key === undefined || !op) break;
        const error =
          op.kind === "save"
            ? await upsertRow(op.payload)
            : await deleteRow(op.id);
        if (error) {
          publish();
          onWriteError(() => retry());
          flushInFlight = false;
          return;
        }
        // A newer change for this team may have arrived while we were syncing.
        if (queue.get(key) === op) {
          queue.delete(key);
          unsyncedIds.delete(key);
        }
        publish();
      }
      flushInFlight = false;
    })();
  }

  function retry(): void {
    if (status === "error") {
      void load();
      return;
    }
    scheduleFlush();
  }

  void load();

  return {
    list: () => teams,
    get: (id) => teams.find((team) => team.id === id),
    save(team: Team) {
      const index = teams.findIndex((existing) => existing.id === team.id);
      teams =
        index === -1
          ? [...teams, team]
          : teams.map((existing, position) =>
              position === index ? team : existing,
            );
      queue.set(team.id, { kind: "save", team, payload: teamToUpsert(team) });
      unsyncedIds.add(team.id);
      publish();
      scheduleFlush();
    },
    delete(id: string) {
      if (!teams.some((team) => team.id === id)) return;
      teams = teams.filter((team) => team.id !== id);
      queue.set(id, { kind: "delete", id });
      unsyncedIds.add(id);
      publish();
      scheduleFlush();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    syncState: () => syncSnapshot,
    retry,
  };
}

let singleton: {
  client: AppSupabaseClient;
  userId: string;
  store: CloudTeamStore;
} | null = null;

/**
 * The cloud store for a signed-in user: one instance per client and user, so
 * the store (and its unsynced changes) survives sign-out and sign-in.
 */
export function getCloudTeamStore(
  client: AppSupabaseClient,
  userId: string,
): CloudTeamStore {
  if (singleton?.client === client && singleton.userId === userId) {
    return singleton.store;
  }
  const store = createCloudTeamStore(client, userId);
  singleton = { client, userId, store };
  return store;
}

/** True when the store is a cloud store (used to read its sync state). */
export function isCloudTeamStore(store: TeamStore): store is CloudTeamStore {
  return typeof (store as CloudTeamStore).syncState === "function";
}
