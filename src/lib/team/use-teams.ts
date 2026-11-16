import { useMemo, useSyncExternalStore } from "react";

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
import { localTeamStore, type TeamStore } from "@/lib/team/team-store";
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
  };
}

export interface UseTeams extends TeamActions {
  /** Every saved team, in the order they were first saved. */
  teams: readonly Team[];
}

/**
 * The saved teams as React state, plus the operations on them. Pass another
 * store to read teams from somewhere other than this browser.
 */
export function useTeams(store: TeamStore = localTeamStore): UseTeams {
  const teams = useSyncExternalStore(store.subscribe, store.list, store.list);
  const actions = useMemo(() => createTeamActions(store), [store]);
  return useMemo(() => ({ teams, ...actions }), [teams, actions]);
}
