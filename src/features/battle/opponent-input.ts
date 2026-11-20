import {
  createDefaultSet,
  getAbility,
  getItem,
  getMove,
  getNature,
  getSpecies,
  listSpecies,
  resolveBattleForme,
  DEFAULT_NATURE,
  MAX_SP_TOTAL,
  totalStatPoints,
  type SpeciesInfo,
} from "@/data";
import type { CommonSet } from "@/lib/metagame/common-sets";
import { importTeam } from "@/lib/team";
import {
  emptyStatsTable,
  STAT_IDS,
  type PokemonSet,
  type StatId,
  type StatsTable,
} from "@/types/pokemon";
import { MAX_TEAM_SIZE } from "@/types/team";

/**
 * Where an opponent's set comes from — the seam the battle-notes stream
 * extends with "revealed" (fields seen in battle, on top of the guess).
 * Everything the matrix needs is data in `OpponentInput`; nothing is hidden
 * in component state.
 */
export type SetProvenance = "common" | "assumed" | "custom" | "revealed";

/** The note fields that override a set's guess, from the notes store. */
export interface RevealedFields {
  item: string | null;
  ability: string | null;
  moves: string[];
  /** The opponent Mega-evolved this Pokémon. */
  mega: boolean;
}

/**
 * One opponent slot as the matrix consumes it: the team-legal species, the
 * set to calculate with, and where the set came from.
 */
export interface OpponentInput {
  /** Team-legal roster name, e.g. "Charizard" (never a battle-only forme). */
  species: string;
  set: PokemonSet;
  provenance: SetProvenance;
}

/** Names compared in lower case with only the letters and digits kept. */
function sameName(a: string, b: string): boolean {
  const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return key(a) === key(b);
}

/**
 * The team-legal species a pasted or typed name stands for, if any: the
 * species itself, the base species of a battle-only forme the name hits
 * ("Charizard-Mega-Y" → "Charizard"), or the first team-legal forme of a
 * base name the roster only has formes of ("Aegislash"). Mirrors how the
 * Showdown importer resolves pasted names.
 */
function resolveRosterSpecies(name: string): SpeciesInfo | undefined {
  const exact = getSpecies(name);
  if (exact && !exact.isBattleOnly) return exact;
  if (exact) {
    const base = exact.baseSpecies
      ? (getSpecies(exact.baseSpecies) ?? undefined)
      : undefined;
    return base && !base.isBattleOnly
      ? base
      : listSpecies({ includeBattleOnly: false }).find((info) =>
          sameName(info.baseSpecies, exact.baseSpecies),
        );
  }
  return listSpecies({ includeBattleOnly: false }).find((info) =>
    sameName(info.baseSpecies, name),
  );
}

/** The roster species a plain line of text names, or null when unknown. */
export function speciesFromLine(line: string): string | null {
  return resolveRosterSpecies(line.trim())?.name ?? null;
}

/** Trims excess Stat Points from the fullest stats until the total is legal. */
function clampStatPoints(statPoints: StatsTable): StatsTable {
  const clamped = { ...statPoints };
  let total = totalStatPoints(clamped);
  while (total > MAX_SP_TOTAL) {
    let target: StatId = STAT_IDS[0];
    for (const id of STAT_IDS) {
      if (clamped[id] > clamped[target]) target = id;
    }
    if (clamped[target] <= 0) break;
    clamped[target] -= 1;
    total -= 1;
  }
  return clamped;
}

/**
 * The most common usage set as a calculable `OpponentInput`. Names from the
 * usage snapshot are validated against the roster (the data layer owns the
 * truth): unknown items, abilities, natures and moves are dropped, an item or
 * ability the species cannot have falls back to its first legal one. A set
 * with no spread data (`assumed`) keeps the "assumed" provenance so the UI
 * never sells a defaulted spread as real usage data.
 */
export function commonSetToInput(
  species: string,
  common: CommonSet,
): OpponentInput {
  const info = getSpecies(species);
  const firstAbility = info?.abilities[0] ?? null;

  const ability = (() => {
    const known = common.ability ? getAbility(common.ability)?.name : null;
    if (!known) return firstAbility;
    return info?.abilities.includes(known) ? known : firstAbility;
  })();

  const nature = common.nature
    ? (getNature(common.nature)?.name ?? DEFAULT_NATURE)
    : DEFAULT_NATURE;

  const moves = common.moves.map((move) =>
    move ? (getMove(move)?.name ?? null) : null,
  );

  return {
    species: info?.name ?? species,
    set: {
      species: info?.name ?? species,
      item: common.item ? (getItem(common.item)?.name ?? null) : null,
      ability,
      nature,
      statPoints: common.assumed
        ? emptyStatsTable()
        : clampStatPoints(common.statPoints),
      moves: [
        moves[0] ?? null,
        moves[1] ?? null,
        moves[2] ?? null,
        moves[3] ?? null,
      ],
    },
    provenance: common.assumed ? "assumed" : "common",
  };
}

/**
 * An opponent with no usage data behind it: the species' default set (first
 * ability, neutral nature, no spread, no moves) labelled "assumed", so the
 * matrix still shows speed order and the slot can be filled in later.
 */
export function assumedInput(species: string): OpponentInput {
  const info = resolveRosterSpecies(species);
  if (!info) {
    return {
      species,
      set: createDefaultSet(species),
      provenance: "assumed",
    };
  }
  return {
    species: info.name,
    set: createDefaultSet(info.name),
    provenance: "assumed",
  };
}

/** A set the user provided in full (a Showdown paste): their data, their call. */
export function customInput(set: PokemonSet): OpponentInput {
  return { species: set.species, set, provenance: "custom" };
}

export interface OpponentParseResult {
  inputs: OpponentInput[];
  /** Sentences for the player about dropped or changed names. */
  warnings: string[];
}

/**
 * Whether a line could only come from a Showdown export: an item line
 * ("Garchomp @ Choice Scarf"), a move line ("- Earthquake") or one of the
 * field lines ("Ability:", "EVs:", "... Nature"). A plain species list has
 * none of these, and consecutive plain lines would otherwise merge into one
 * Showdown block.
 */
function looksLikeShowdown(text: string): boolean {
  return text.split(/\r\n|\r|\n/).some((raw) => {
    const line = raw.trim();
    return (
      / @ /.test(line) ||
      /^[-•~]/.test(line) ||
      /^(ability|trait|evs|sps|level|shiny|ivs)\s*:/i.test(line) ||
      /\snature$/i.test(line)
    );
  });
}

/**
 * Reads the opponent's side from text: a Showdown export in full (each set
 * becomes a "custom" slot) or a plain list of species names, one per line
 * (each becomes an "assumed" slot that the usage data then fills in). At
 * most six Pokémon are kept.
 */
export function opponentsFromText(text: string): OpponentParseResult {
  if (looksLikeShowdown(text)) {
    const imported = importTeam(text);
    if (imported.sets.length > 0) {
      return {
        inputs: imported.sets.slice(0, MAX_TEAM_SIZE).map(customInput),
        warnings: imported.warnings,
      };
    }
  }

  const inputs: OpponentInput[] = [];
  const warnings: string[] = [];
  const unknown: string[] = [];
  let leftOut = 0;
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    if (line === "") continue;
    if (inputs.length >= MAX_TEAM_SIZE) {
      leftOut += 1;
      continue;
    }
    const species = speciesFromLine(line);
    if (species) {
      inputs.push(assumedInput(species));
    } else {
      unknown.push(line);
    }
  }
  if (unknown.length > 0) {
    warnings.push(`Not in Pokémon Champions: ${unknown.join(", ")}.`);
  }
  if (leftOut > 0) {
    warnings.push(
      `A team holds ${MAX_TEAM_SIZE} Pokémon; ${leftOut} more ${leftOut === 1 ? "was" : "were"} left out.`,
    );
  }
  return { inputs, warnings };
}

/** True when the note holds at least one revealed field. */
export function hasRevealedFields(note: RevealedFields | undefined): boolean {
  if (!note) return false;
  return (
    note.item !== null ||
    note.ability !== null ||
    note.moves.length > 0 ||
    note.mega
  );
}

/** The Mega Stone of this species the item is, or null. */
function stoneFor(species: string, item: string): string | null {
  const info = getSpecies(species);
  if (!info) return null;
  return info.megas.some((mega) => mega.stone === item) ? item : null;
}

/**
 * Lays a battle note over an opponent input: revealed fields override the
 * guess, everything unrevealed stays as it was, and a Mega flag (or a
 * revealed Mega Stone) turns the set into its Mega forme the way the
 * calculator does it — forme stats, the forme's own ability, the stone
 * held. Revealed moves come first; the remaining slots keep the guessed
 * moves, so the matrix never loses coverage. The provenance becomes
 * "revealed" only when something was actually revealed.
 */
export function applyRevealedFields(
  input: OpponentInput,
  note: RevealedFields | undefined,
): OpponentInput {
  if (!hasRevealedFields(note) || !note) return input;

  const item = note.item ? (getItem(note.item)?.name ?? null) : null;
  const stone = item ? stoneFor(input.species, item) : null;
  const isMega = note.mega || stone !== null;

  const set: PokemonSet = { ...input.set };
  const revealedAbility = note.ability
    ? (getAbility(note.ability)?.name ?? null)
    : null;
  if (isMega) {
    const held = stone ?? getSpecies(input.species)?.megas[0]?.stone ?? null;
    if (held) {
      set.item = held;
      const formeName = resolveBattleForme(input.species, held);
      const forme = getSpecies(formeName);
      set.species = formeName;
      set.ability = revealedAbility ?? forme?.abilities[0] ?? set.ability;
    }
  } else {
    if (item) set.item = item;
    if (revealedAbility) set.ability = revealedAbility;
  }

  const moves: string[] = note.moves
    .map((move) => getMove(move)?.name)
    .filter((name): name is string => name !== undefined);
  for (const existing of input.set.moves) {
    if (moves.length >= input.set.moves.length) break;
    if (existing && !moves.includes(existing)) moves.push(existing);
  }
  set.moves = [
    moves[0] ?? null,
    moves[1] ?? null,
    moves[2] ?? null,
    moves[3] ?? null,
  ];

  return { species: input.species, set, provenance: "revealed" };
}
