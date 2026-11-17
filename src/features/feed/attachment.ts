import type { Json } from "@/lib/database.types";
import type { BattleFormat } from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";
import { STAT_IDS, emptyStatsTable } from "@/types/pokemon";
import type { Team } from "@/types/team";

export type TeamAttachment = {
  kind: "team";
  name: string;
  format: BattleFormat;
  members: PokemonSet[];
};

export function teamAttachment(team: Team): TeamAttachment {
  return {
    kind: "team",
    name: team.name,
    format: team.format,
    members: [...team.members],
  };
}

/** The JSON shape stored in the posts.attachment column. */
export type TeamAttachmentJson = {
  kind: "team";
  name: string;
  format: string;
  members: Json[];
};

export function teamAttachmentJson(
  attachment: TeamAttachment,
): TeamAttachmentJson {
  return {
    kind: "team",
    name: attachment.name,
    format: attachment.format,
    members: attachment.members.map(setToJson),
  };
}

function setToJson(set: PokemonSet): Json {
  const value: Record<string, Json | undefined> = {
    species: set.species,
    item: set.item,
    ability: set.ability,
    nature: set.nature,
    statPoints: set.statPoints,
    moves: set.moves,
  };
  if (set.nickname !== undefined) value.nickname = set.nickname;
  if (set.gender !== undefined) value.gender = set.gender;
  return value;
}

export function parseTeamAttachment(value: Json | null): TeamAttachment | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const record: Record<string, Json | undefined> = value;
  if (record.kind !== "team") return null;
  if (typeof record.name !== "string") return null;
  if (record.format !== "singles" && record.format !== "doubles") return null;
  if (!Array.isArray(record.members)) return null;
  const members: PokemonSet[] = [];
  for (const member of record.members) {
    const set = parseSet(member);
    if (!set) return null;
    members.push(set);
  }
  return { kind: "team", name: record.name, format: record.format, members };
}

function parseSet(value: Json): PokemonSet | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const record: Record<string, Json | undefined> = value;
  if (typeof record.species !== "string" || record.species === "") return null;
  const item = record.item;
  if (item !== null && typeof item !== "string") return null;
  const ability = record.ability;
  if (ability !== null && typeof ability !== "string") return null;
  if (typeof record.nature !== "string") return null;
  const rawStats = record.statPoints;
  if (
    typeof rawStats !== "object" ||
    rawStats === null ||
    Array.isArray(rawStats)
  )
    return null;
  const statPoints = emptyStatsTable();
  for (const id of STAT_IDS) {
    const stat = rawStats[id];
    if (typeof stat !== "number") return null;
    statPoints[id] = stat;
  }
  const rawMoves = record.moves;
  if (!Array.isArray(rawMoves) || rawMoves.length !== 4) return null;
  for (const move of rawMoves) {
    if (move !== null && typeof move !== "string") return null;
  }
  const moves = rawMoves as [
    string | null,
    string | null,
    string | null,
    string | null,
  ];
  const set: PokemonSet = {
    species: record.species,
    item,
    ability,
    nature: record.nature,
    statPoints,
    moves,
  };
  if (typeof record.nickname === "string") set.nickname = record.nickname;
  if (record.gender === "M" || record.gender === "F" || record.gender === "N")
    set.gender = record.gender;
  return set;
}
