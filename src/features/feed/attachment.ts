import type { Json } from "@/lib/database.types";
import type { BattleFormat, DamageResult } from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";
import { STAT_IDS, emptyStatsTable } from "@/types/pokemon";
import type { Team } from "@/types/team";

export type TeamAttachment = {
  kind: "team";
  name: string;
  format: BattleFormat;
  /** The team's Champions team ID, when it has one. */
  gameTeamId?: string;
  members: PokemonSet[];
};

export function teamAttachment(team: Team): TeamAttachment {
  const attachment: TeamAttachment = {
    kind: "team",
    name: team.name,
    format: team.format,
    members: [...team.members],
  };
  if (team.gameTeamId) attachment.gameTeamId = team.gameTeamId;
  return attachment;
}

/** The JSON shape stored in the posts.attachment column. */
export type TeamAttachmentJson = {
  kind: "team";
  name: string;
  format: string;
  gameTeamId?: string;
  members: Json[];
};

export function teamAttachmentJson(
  attachment: TeamAttachment,
): TeamAttachmentJson {
  const json: TeamAttachmentJson = {
    kind: "team",
    name: attachment.name,
    format: attachment.format,
    members: attachment.members.map(setToJson),
  };
  if (attachment.gameTeamId) json.gameTeamId = attachment.gameTeamId;
  return json;
}

export type CalcResultAttachment = {
  kind: "calc-result";
  /** Attacker and defender names for the preview, e.g. "Garchomp". */
  attacker: string;
  defender: string;
  move: string;
  min: number;
  max: number;
  minPercent: number;
  maxPercent: number;
  defenderMaxHp: number;
  rolls: number[] | null;
  description: string;
  koText: string;
};

export function calcResultAttachment(
  attacker: string,
  defender: string,
  result: DamageResult,
): CalcResultAttachment {
  return {
    kind: "calc-result",
    attacker,
    defender,
    move: result.move,
    min: result.min,
    max: result.max,
    minPercent: result.minPercent,
    maxPercent: result.maxPercent,
    defenderMaxHp: result.defenderMaxHp,
    rolls: result.rolls ? [...result.rolls] : null,
    description: result.description,
    koText: result.koText,
  };
}

/** The JSON shape stored in the posts.attachment column. */
export type CalcResultAttachmentJson = {
  kind: "calc-result";
  attacker: string;
  defender: string;
  move: string;
  min: number;
  max: number;
  minPercent: number;
  maxPercent: number;
  defenderMaxHp: number;
  rolls: Json[] | null;
  description: string;
  koText: string;
};

export function calcResultAttachmentJson(
  attachment: CalcResultAttachment,
): CalcResultAttachmentJson {
  return {
    kind: "calc-result",
    attacker: attachment.attacker,
    defender: attachment.defender,
    move: attachment.move,
    min: attachment.min,
    max: attachment.max,
    minPercent: attachment.minPercent,
    maxPercent: attachment.maxPercent,
    defenderMaxHp: attachment.defenderMaxHp,
    rolls: attachment.rolls,
    description: attachment.description,
    koText: attachment.koText,
  };
}

export function parseCalcResultAttachment(
  value: Json | null,
): CalcResultAttachment | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const record: Record<string, Json | undefined> = value;
  if (record.kind !== "calc-result") return null;
  if (typeof record.attacker !== "string") return null;
  if (typeof record.defender !== "string") return null;
  if (typeof record.move !== "string") return null;
  if (typeof record.min !== "number") return null;
  if (typeof record.max !== "number") return null;
  if (typeof record.minPercent !== "number") return null;
  if (typeof record.maxPercent !== "number") return null;
  if (typeof record.defenderMaxHp !== "number") return null;
  const rawRolls = record.rolls;
  let rolls: number[] | null = null;
  if (rawRolls !== null) {
    if (!Array.isArray(rawRolls)) return null;
    for (const roll of rawRolls) {
      if (typeof roll !== "number") return null;
    }
    rolls = rawRolls as number[];
  }
  if (typeof record.description !== "string") return null;
  if (typeof record.koText !== "string") return null;
  return {
    kind: "calc-result",
    attacker: record.attacker,
    defender: record.defender,
    move: record.move,
    min: record.min,
    max: record.max,
    minPercent: record.minPercent,
    maxPercent: record.maxPercent,
    defenderMaxHp: record.defenderMaxHp,
    rolls,
    description: record.description,
    koText: record.koText,
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
  const attachment: TeamAttachment = {
    kind: "team",
    name: record.name,
    format: record.format,
    members,
  };
  const gameTeamId = record.gameTeamId;
  if (typeof gameTeamId === "string" && gameTeamId !== "") {
    attachment.gameTeamId = gameTeamId;
  }
  return attachment;
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
