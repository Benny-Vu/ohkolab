import { useCallback, useMemo, useSyncExternalStore } from "react";

import { useAuth } from "@/lib/auth/use-auth";
import { resolveActiveTeamStore } from "@/lib/team/active-store";
import {
  isCloudTeamStore,
  type CloudSyncState,
} from "@/lib/team/cloud-team-store";
import {
  addMember,
  createTeam,
  duplicateTeam,
  moveMember,
  removeMember,
  renameTeam,
  setMembers,
  setTeamFormat,
  updateMember,
  type NewTeamInit,
} from "@/lib/team/team-ops";
import type { TeamStore } from "@/lib/team/team-store";
import type { BattleFormat } from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";
import type { Team } from "@/types/team";

/** Everything the pages can do to the saved teams. */
export interface TeamActions {
  /** Saves a new team and returns it. */
  create(init: NewTeamInit): Team;
  rename(id: string, name: string): void;
  setFormat(id: string, format: BattleFormat): void;
  /** Saves a copy under a new id and returns it; undefined for an unknown id. */
  duplicate(id: string): Team | undefined;
  remove(id: string): void;
  setMembers(id: string, members: readonly PokemonSet[]): void;
  /** Appends a member; does nothing when the team is full. */
  addMember(id: string, set: PokemonSet): void;
  updateMember(id: string, index: number, set: PokemonSet): void;
  removeMember(id: string, index: number): void;
  /** Moves the member at `from` to position `to`. */
  moveMember(id: string, from: number, to: number): void;
  /** Saves the team as it was (Undo), keeping its `updatedAt`. */
  restore(team: Team): void;
  /** Shows or hides the team to other players. */
  setPublic(id: string, isPublic: boolean): void;
}

/** The team operations bound to a store. Unknown ids are ignored. */
export function createTeamActions(store: TeamStore): TeamActions {
  function change(id: string, apply: (team: Team) => Team): void {
    const team = store.get(id);
    if (!team) return;
    const next = apply(team);
    if (next !== team) store.save(next);
  }

  return {
    create(init) {
      const team = createTeam(init);
      store.save(team);
      return team;
    },
    rename: (id, name) => change(id, (team) => renameTeam(team, name)),
    setFormat: (id, format) =>
      change(id, (team) => setTeamFormat(team, format)),
    duplicate(id) {
      const team = store.get(id);
      if (!team) return undefined;
      const copy = duplicateTeam(
        team,
        store.list().map((existing) => existing.name),
      );
      store.save(copy);
      return copy;
    },
    remove: (id) => store.delete(id),
    setMembers: (id, members) =>
      change(id, (team) => setMembers(team, members)),
    addMember: (id, set) => change(id, (team) => addMember(team, set)),
    updateMember: (id, index, set) =>
      change(id, (team) => updateMember(team, index, set)),
    removeMember: (id, index) =>
      change(id, (team) => removeMember(team, index)),
    moveMember: (id, from, to) =>
      change(id, (team) => moveMember(team, from, to)),
    restore: (team) => store.save(team),
    setPublic(id, isPublic) {
      const current = store.get(id);
      if (!current || (current.isPublic ?? false) === isPublic) return;
      store.save({ ...current, isPublic });
    },
  };
}

/** Where the sync of the active store is at, for pages that show it. */
export interface TeamSync {
  loading: boolean;
  /** Friendly text when the teams could not be loaded. */
  error: string | null;
  /** Tries the failed load or write again. */
  retry(): void;
}

/** The sync state of a store without a server behind it. */
const LOCAL_SYNC: CloudSyncState = {
  status: "ready",
  message: null,
  unsynced: [],
};

export interface UseTeams extends TeamActions {
  /** Every saved team, in the order they were first saved. */
  teams: readonly Team[];
  /** The sync state of the active store. */
  sync: TeamSync;
}

/**
 * The saved teams as React state, plus the operations on them. With no store
 * passed it follows the account: the local store for guests and unconfigured
 * builds, the cloud store for signed-in users. Pass a store to read teams
 * from somewhere specific.
 */
export function useTeams(store?: TeamStore): UseTeams {
  const auth = useAuth();
  const active = useMemo(
    () => store ?? resolveActiveTeamStore(auth),
    [store, auth],
  );
  const teams = useSyncExternalStore(
    active.subscribe,
    active.list,
    active.list,
  );
  const getSync = useCallback(
    () => (isCloudTeamStore(active) ? active.syncState() : LOCAL_SYNC),
    [active],
  );
  const syncState = useSyncExternalStore(active.subscribe, getSync, getSync);
  const actions = useMemo(() => createTeamActions(active), [active]);
  return useMemo(
    () => ({
      teams,
      sync: {
        loading: syncState.status === "loading",
        error: syncState.status === "error" ? syncState.message : null,
        retry: isCloudTeamStore(active) ? active.retry : () => {},
      },
      ...actions,
    }),
    [teams, syncState, active, actions],
  );
}
