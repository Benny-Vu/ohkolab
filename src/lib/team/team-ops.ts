import type { BattleFormat } from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";
import { MAX_TEAM_SIZE, type Team } from "@/types/team";

/**
 * Pure operations on a `Team`. Each returns a new team (the input is never
 * mutated) and stamps `updatedAt`. The stores and the React hook build on
 * these, so the rules live in one place.
 */

export const DEFAULT_TEAM_NAME = "Untitled team";

export interface NewTeamInit {
  name?: string;
  format: BattleFormat;
  members?: readonly PokemonSet[];
  /** The Champions team ID, already sanitized; skipped when empty. */
  gameTeamId?: string;
}

function timestamp(now: Date): string {
  return now.toISOString();
}

/** A new team with a fresh id. Members beyond the team size are dropped. */
export function createTeam(init: NewTeamInit, now = new Date()): Team {
  const stamp = timestamp(now);
  const team: Team = {
    id: crypto.randomUUID(),
    name: init.name?.trim() || DEFAULT_TEAM_NAME,
    format: init.format,
    members: (init.members ?? []).slice(0, MAX_TEAM_SIZE),
    createdAt: stamp,
    updatedAt: stamp,
  };
  if (init.gameTeamId) team.gameTeamId = init.gameTeamId;
  return team;
}

export function renameTeam(team: Team, name: string, now = new Date()): Team {
  return { ...team, name, updatedAt: timestamp(now) };
}

export function setTeamFormat(
  team: Team,
  format: BattleFormat,
  now = new Date(),
): Team {
  return { ...team, format, updatedAt: timestamp(now) };
}

/** Sets or clears the Champions team ID; an empty string removes it. */
export function setGameTeamId(
  team: Team,
  gameTeamId: string,
  now = new Date(),
): Team {
  return { ...team, gameTeamId: gameTeamId || null, updatedAt: timestamp(now) };
}

/**
 * A copy with a new id, named "<name> (copy)", or "<name> (copy 2)" and so
 * on when that name is already in `takenNames`.
 */
export function duplicateTeam(
  team: Team,
  takenNames: readonly string[] = [],
  now = new Date(),
): Team {
  const base = team.name.trim() || DEFAULT_TEAM_NAME;
  const taken = new Set(takenNames);
  let name = `${base} (copy)`;
  for (let count = 2; taken.has(name); count++) {
    name = `${base} (copy ${count})`;
  }
  const stamp = timestamp(now);
  return {
    ...team,
    id: crypto.randomUUID(),
    name,
    members: structuredClone(team.members),
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/** Replaces the whole member list, capped at the team size. */
export function setMembers(
  team: Team,
  members: readonly PokemonSet[],
  now = new Date(),
): Team {
  return {
    ...team,
    members: members.slice(0, MAX_TEAM_SIZE),
    updatedAt: timestamp(now),
  };
}

/** Appends a member. A full team is returned unchanged. */
export function addMember(team: Team, set: PokemonSet, now = new Date()): Team {
  if (team.members.length >= MAX_TEAM_SIZE) return team;
  return setMembers(team, [...team.members, set], now);
}

/** Replaces the member at `index`. An index outside the team changes nothing. */
export function updateMember(
  team: Team,
  index: number,
  set: PokemonSet,
  now = new Date(),
): Team {
  if (!isMemberIndex(team, index)) return team;
  const members = [...team.members];
  members[index] = set;
  return setMembers(team, members, now);
}

/** Removes the member at `index`. An index outside the team changes nothing. */
export function removeMember(
  team: Team,
  index: number,
  now = new Date(),
): Team {
  if (!isMemberIndex(team, index)) return team;
  return setMembers(
    team,
    team.members.filter((_, position) => position !== index),
    now,
  );
}

/**
 * Moves the member at `from` to position `to`, shifting the ones in between.
 * Indices outside the team, or a move to the same place, change nothing.
 */
export function moveMember(
  team: Team,
  from: number,
  to: number,
  now = new Date(),
): Team {
  if (!isMemberIndex(team, from) || !isMemberIndex(team, to) || from === to) {
    return team;
  }
  const members = [...team.members];
  const [moved] = members.splice(from, 1);
  if (!moved) return team;
  members.splice(to, 0, moved);
  return setMembers(team, members, now);
}

/** Teams sorted for display: most recently updated first. */
export function sortByUpdated(teams: readonly Team[]): Team[] {
  return [...teams].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function isMemberIndex(team: Team, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < team.members.length;
}
