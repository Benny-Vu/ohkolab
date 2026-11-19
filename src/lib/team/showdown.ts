import {
  DEFAULT_NATURE,
  getAbility,
  getItem,
  getMove,
  getNature,
  getSpecies,
  LEVEL,
  listSpecies,
  MAX_SP_PER_STAT,
  MAX_SP_TOTAL,
  type SpeciesInfo,
} from "@/data";
import {
  STAT_IDS,
  STAT_LABELS,
  emptyStatsTable,
  type Gender,
  type PokemonSet,
  type StatId,
  type StatsTable,
} from "@/types/pokemon";
import { MAX_TEAM_SIZE } from "@/types/team";
import { isValidGameTeamId } from "@/lib/team/game-id";

/**
 * Pokémon Showdown's team text, the format every Pokémon tool can paste:
 *
 *     Chomper (Garchomp) (M) @ Life Orb
 *     Ability: Rough Skin
 *     Level: 50
 *     EVs: 2 HP / 32 Atk / 32 Spe
 *     Jolly Nature
 *     - Earthquake
 *     - Protect
 *
 * Stat Points. Showdown has no separate line for Champions Stat Points: it
 * keeps them in the set's `evs` field and writes them on the ordinary `EVs:`
 * line with Stat Point values, leaving out the stats at 0. `exportSet` writes
 * the same, plus the `Level: 50` line Showdown's teambuilder adds for every
 * level other than 100. (Sources: the vault note "metagame-data-sources",
 * section "Showdown team text format for Champions".)
 *
 * The price of that choice is that an `EVs:` line does not say which game it
 * is from, so the import has to guess:
 *
 * - No value above 32: the numbers are Stat Points and are kept as they are.
 *   Every legal Champions spread fits, so our own exports and Showdown's
 *   Champions exports always round-trip.
 * - Any value above 32: the line is an EV spread from another game and every
 *   value is converted with `floor((EVs + 4) / 8)`, since the first Stat Point
 *   equals 4 EVs and each further one 8: 252 EVs become 32, 4 EVs become 1,
 *   and the usual 252 / 252 / 4 becomes 32 / 32 / 1. The import says so.
 * - A line labelled `SPs:`, `Stat Points:` or `Points:` (Showdown never
 *   writes these, other tools might) is always read as Stat Points.
 * - Whatever still breaks a limit is cut down: each stat to 32, then the
 *   total to 66 by taking points from the smallest investments first, so the
 *   stats the set is built around survive. The import says so in a warning.
 *
 * The one wrong guess left is an EV spread from another game with no value
 * above 32 (say `EVs: 4 HP` alone), which is read as Stat Points.
 *
 * Everything else: Level, Shiny, Tera Type, IVs, Happiness and any line that
 * is not understood are ignored. Unknown species, items, abilities, natures
 * and moves never fail the import; they are reported as warnings and the rest
 * of the text is imported.
 */

export interface ImportedSet {
  /** Null when the text has no Pokémon or its species is unknown. */
  set: PokemonSet | null;
  /** What was dropped or changed, as sentences for the player. */
  warnings: string[];
}

export interface ImportedTeam {
  /** The team name from a Showdown backup header (`=== [format] Name ===`). */
  name: string | null;
  /** The Champions team ID from a `// Champions team ID:` comment, if any. */
  gameTeamId: string | null;
  sets: PokemonSet[];
  warnings: string[];
}

const GAME = "Pokémon Champions";
const EV_NOTICE =
  "EV spreads from another game were converted to Stat Points (4 EVs for the first point, 8 for each further one).";

// ---------------------------------------------------------------- export

/** One set as Showdown text, without a trailing line break. */
export function exportSet(set: PokemonSet): string {
  let head =
    set.nickname && set.nickname !== set.species
      ? `${set.nickname} (${set.species})`
      : set.species;
  if (set.gender === "M" || set.gender === "F") head += ` (${set.gender})`;
  if (set.item) head += ` @ ${set.item}`;

  const lines = [head];
  if (set.ability) lines.push(`Ability: ${set.ability}`);
  lines.push(`Level: ${LEVEL}`);
  const spread = STAT_IDS.filter((stat) => set.statPoints[stat] > 0).map(
    (stat) => `${set.statPoints[stat]} ${STAT_LABELS[stat]}`,
  );
  if (spread.length > 0) lines.push(`EVs: ${spread.join(" / ")}`);
  if (set.nature) lines.push(`${set.nature} Nature`);
  for (const move of set.moves) {
    if (move) lines.push(`- ${move}`);
  }
  return lines.join("\n");
}

/**
 * A whole team as Showdown text: the sets separated by blank lines. When the
 * team has a Champions team ID, it rides along as a comment on the first
 * line — `// Champions team ID: XXXXXXXXXX` — so exports round-trip it and
 * other tools ignore it as a comment.
 */
export function exportTeam(
  members: readonly PokemonSet[],
  gameTeamId?: string | null,
): string {
  if (members.length === 0) return "";
  const body = `${members.map(exportSet).join("\n\n")}\n`;
  return gameTeamId ? `// Champions team ID: ${gameTeamId}\n${body}` : body;
}

/** The comment prefix that carries a Champions team ID in an export. */
const GAME_TEAM_ID_PREFIX = "// Champions team ID:";

/** Reads the `// Champions team ID: XXXXXXXXXX` comment out of export text. */
export function readGameTeamIdFromText(text: string): string | null {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(GAME_TEAM_ID_PREFIX)) {
      const id = trimmed.slice(GAME_TEAM_ID_PREFIX.length).trim();
      return isValidGameTeamId(id) ? id : null;
    }
  }
  return null;
}

// ---------------------------------------------------------------- import

/** Showdown's stat names, matched exactly ("Spd" is its old name for Speed). */
const STAT_NAMES: Record<string, StatId> = {
  HP: "hp",
  hp: "hp",
  Atk: "atk",
  atk: "atk",
  Def: "def",
  def: "def",
  SpA: "spa",
  SAtk: "spa",
  SpAtk: "spa",
  spa: "spa",
  Spc: "spa",
  spc: "spa",
  SpD: "spd",
  SDef: "spd",
  SpDef: "spd",
  spd: "spd",
  Spe: "spe",
  Spd: "spe",
  spe: "spe",
};

/** Looser spellings, compared in lower case with only the letters kept. */
const LOOSE_STAT_NAMES: Record<string, StatId> = {
  hp: "hp",
  atk: "atk",
  attack: "atk",
  def: "def",
  defense: "def",
  defence: "def",
  spa: "spa",
  spatk: "spa",
  satk: "spa",
  specialattack: "spa",
  spd: "spd",
  spdef: "spd",
  sdef: "spd",
  specialdefense: "spd",
  specialdefence: "spd",
  spe: "spe",
  speed: "spe",
};

function statId(name: string): StatId | undefined {
  return (
    STAT_NAMES[name] ??
    LOOSE_STAT_NAMES[name.toLowerCase().replace(/[^a-z]/g, "")]
  );
}

/** Reads "252 Atk / 4 SpD / 252+ Spe (Jolly)" into the stats it names. */
function parseSpread(text: string): Partial<StatsTable> {
  const values: Partial<StatsTable> = {};
  for (const part of (text.split("(")[0] ?? "").split("/")) {
    const match = /^(\d+)\s*[+-]?\s+(.+)$/.exec(part.trim());
    if (!match?.[1] || !match[2]) continue;
    const stat = statId(match[2].trim());
    if (stat) values[stat] = Number.parseInt(match[1], 10);
  }
  return values;
}

export interface StatSpread {
  statPoints: StatsTable;
  /** The numbers were EVs from another game. */
  convertedFromEvs: boolean;
  /** Points had to be cut to respect a limit. */
  reduced: boolean;
}

/**
 * Stat Points from the numbers on a spread line. `kind` is "sp" when the
 * line's label says they are Stat Points and "evs" when it has to be guessed
 * (see the top of this file).
 */
export function toStatPoints(
  values: Partial<StatsTable>,
  kind: "evs" | "sp",
): StatSpread {
  const given = emptyStatsTable();
  for (const stat of STAT_IDS) {
    const value = values[stat] ?? 0;
    given[stat] = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  }
  const areStatPoints =
    kind === "sp" || STAT_IDS.every((stat) => given[stat] <= MAX_SP_PER_STAT);

  const statPoints = emptyStatsTable();
  let reduced = false;
  for (const stat of STAT_IDS) {
    const value = given[stat];
    const points = areStatPoints ? value : Math.floor((value + 4) / 8);
    statPoints[stat] = Math.min(MAX_SP_PER_STAT, points);
    // An EV value over 252 is as illegal as a Stat Point value over 32.
    if (points > MAX_SP_PER_STAT) reduced = true;
  }

  let excess =
    STAT_IDS.reduce((sum, stat) => sum + statPoints[stat], 0) - MAX_SP_TOTAL;
  while (excess > 0) {
    let smallest: StatId | undefined;
    for (const stat of STAT_IDS) {
      if (
        statPoints[stat] > 0 &&
        (!smallest || statPoints[stat] <= statPoints[smallest])
      ) {
        smallest = stat;
      }
    }
    if (!smallest) break;
    statPoints[smallest] -= 1;
    excess -= 1;
    reduced = true;
  }

  return { statPoints, convertedFromEvs: !areStatPoints, reduced };
}

interface ResolvedSpecies {
  name: string;
  /** A Mega Stone the pasted forme implies, e.g. for "Garchomp-Mega". */
  impliedItem: string | null;
  /** The pasted name was an in-battle forme, so its ability is that forme's. */
  fromBattleForme: boolean;
  /** Set when the pasted name was not used as it is. */
  warning: string | null;
}

function sameName(a: string, b: string): boolean {
  const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return key(a) === key(b);
}

/**
 * The team-legal species a name stands for: the species itself, or, for a
 * name the roster only has formes of, its first forme. Showdown writes
 * "Aegislash" where the roster has "Aegislash-Shield".
 */
function teamSpecies(name: string): SpeciesInfo | undefined {
  const exact = getSpecies(name);
  if (exact && !exact.isBattleOnly) return exact;
  return listSpecies().find((info) => sameName(info.baseSpecies, name));
}

/**
 * Finds the team-legal species for a pasted name. Megas and other in-battle
 * formes become their base species; a forme Champions does not have (often a
 * cosmetic one, like "Pikachu-Belle") falls back to the species before the
 * last hyphen that exists.
 */
function resolveSpecies(text: string): ResolvedSpecies | null {
  const direct = teamSpecies(text);
  if (direct) {
    return {
      name: direct.name,
      impliedItem: null,
      fromBattleForme: false,
      warning: null,
    };
  }

  const battleOnly = getSpecies(text);
  if (battleOnly) {
    const base = teamSpecies(battleOnly.baseSpecies);
    if (!base) return null;
    return {
      name: base.name,
      impliedItem: battleOnly.megaStone,
      fromBattleForme: true,
      warning: `${battleOnly.name} only exists in battle; ${base.name} was imported instead.`,
    };
  }

  let shorter = text;
  while (shorter.includes("-")) {
    shorter = shorter.slice(0, shorter.lastIndexOf("-"));
    const info = teamSpecies(shorter);
    if (info) {
      return {
        name: info.name,
        impliedItem: null,
        fromBattleForme: false,
        warning: `"${text}" is not in ${GAME}; ${info.name} was imported instead.`,
      };
    }
  }
  return null;
}

interface HeadLine {
  nickname: string | null;
  species: string;
  gender: Gender | null;
  item: string | null;
}

/** Splits "Nickname (Species) (M) @ Item"; every part but the species is optional. */
function parseHeadLine(line: string): HeadLine {
  let rest = line;
  let item: string | null = null;
  // " @" with the space in front, so a nickname like "a@b" stays whole.
  const at = rest.lastIndexOf(" @");
  if (at !== -1) {
    item = rest.slice(at + 2).trim() || null;
    rest = rest.slice(0, at).trim();
  }

  let gender: Gender | null = null;
  const genderMatch = /\s\((M|F)\)$/.exec(rest);
  if (genderMatch) {
    gender = genderMatch[1] === "M" ? "M" : "F";
    rest = rest.slice(0, genderMatch.index).trim();
  }

  const open = rest.lastIndexOf(" (");
  if (rest.endsWith(")") && open !== -1 && !getSpecies(rest)) {
    return {
      nickname: rest.slice(0, open).trim() || null,
      species: rest.slice(open + 2, -1).trim(),
      gender,
      item,
    };
  }
  return { nickname: null, species: rest, gender, item };
}

interface ParsedBlock extends ImportedSet {
  convertedFromEvs: boolean;
}

/** One Pokémon from its lines (already trimmed, none of them empty). */
function parseBlock(lines: readonly string[]): ParsedBlock {
  const warnings: string[] = [];
  const head = parseHeadLine(lines[0] ?? "");
  const resolved = resolveSpecies(head.species);
  if (!resolved) {
    warnings.push(
      `"${head.species}" is not in ${GAME}; that Pokémon was skipped.`,
    );
    return { set: null, warnings, convertedFromEvs: false };
  }
  if (resolved.warning) warnings.push(resolved.warning);

  const species = resolved.name;
  const info = getSpecies(species);
  const label = head.nickname ? `${head.nickname} (${species})` : species;

  let item = resolved.impliedItem;
  if (head.item && !/^no item$/i.test(head.item)) {
    const known = getItem(head.item);
    if (known) item = known.name;
    else {
      warnings.push(
        `${label}: the item "${head.item}" is not in ${GAME} and was removed.`,
      );
    }
  }

  let ability = info?.abilities[0] ?? null;
  let nature = DEFAULT_NATURE;
  let statPoints = emptyStatsTable();
  let convertedFromEvs = false;
  const moves: string[] = [];
  let extraMoves = false;

  for (const line of lines.slice(1)) {
    const field = /^([A-Za-z ]+):\s*(.*)$/.exec(line);
    const key = field?.[1]?.trim().toLowerCase();
    const value = field?.[2]?.trim() ?? "";

    if (/^[-~•]/.test(line)) {
      // "- Move", Showdown's "- Hidden Power [Ice]" and the "- A / B" of
      // sample sets, where the first option is taken.
      const name = (line.slice(1).split(" / ")[0] ?? "")
        .replace(/\[(.*)\]/, "$1")
        .trim();
      if (!name) continue;
      const known = getMove(name);
      if (!known) {
        warnings.push(
          `${label}: the move "${name}" is not in ${GAME} and was left out.`,
        );
      } else if (moves.length >= 4) {
        extraMoves = true;
      } else {
        moves.push(known.name);
      }
    } else if (key === "ability" || key === "trait") {
      const known = getAbility(value);
      if (known) {
        // A pasted Mega names the Mega's ability; the base species keeps its own.
        const belongsToForme =
          resolved.fromBattleForme && !info?.abilities.includes(known.name);
        if (!belongsToForme) ability = known.name;
      } else if (value && !/^no ability$/i.test(value)) {
        warnings.push(
          ability
            ? `${label}: the ability "${value}" is not in ${GAME}; ${ability} was used instead.`
            : `${label}: the ability "${value}" is not in ${GAME} and was removed.`,
        );
      }
    } else if (
      key === "evs" ||
      key === "sps" ||
      key === "sp" ||
      key === "stat points" ||
      key === "points"
    ) {
      const spread = toStatPoints(
        parseSpread(value),
        key === "evs" ? "evs" : "sp",
      );
      statPoints = spread.statPoints;
      convertedFromEvs = spread.convertedFromEvs;
      if (spread.reduced) {
        warnings.push(
          `${label}: the stat spread was over the limits (${MAX_SP_PER_STAT} per stat, ${MAX_SP_TOTAL} in total) and was reduced.`,
        );
      }
    } else if (!field && /\snature$/i.test(line)) {
      const name = line.replace(/\s+nature$/i, "").trim();
      const known = getNature(name);
      if (known) nature = known.name;
      else {
        warnings.push(
          `${label}: "${name}" is not a nature; ${DEFAULT_NATURE} was used instead.`,
        );
      }
    }
    // Level, Shiny, Tera Type, IVs, Happiness... and anything unknown: ignored.
  }
  if (extraMoves) {
    warnings.push(`${label}: only the first four moves were kept.`);
  }

  const set: PokemonSet = {
    species,
    item,
    ability,
    nature,
    statPoints,
    moves: [
      moves[0] ?? null,
      moves[1] ?? null,
      moves[2] ?? null,
      moves[3] ?? null,
    ],
  };
  if (head.nickname && head.nickname !== species) set.nickname = head.nickname;
  if (head.gender) set.gender = head.gender;
  return { set, warnings, convertedFromEvs };
}

interface Blocks {
  name: string | null;
  blocks: string[][];
}

/** Groups the text into one block of lines per Pokémon. */
function splitBlocks(text: string): Blocks {
  const blocks: string[][] = [];
  let name: string | null = null;
  let current: string[] = [];
  const flush = () => {
    if (current.length > 0) blocks.push(current);
    current = [];
  };

  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    // Showdown's backup format puts "=== [format] Team name ===" above a team.
    const header = /^===\s*(?:\[[^\]]*\]\s*)?(.*?)\s*===$/.exec(line);
    if (header) {
      flush();
      name ??= header[1] || null;
    } else if (line === "") {
      flush();
    } else if (line.startsWith("//")) {
      // A comment: our own exports carry the Champions team ID here, and
      // other tools may leave notes. Comments are never set lines.
      continue;
    } else {
      current.push(line);
    }
  }
  flush();
  return { name, blocks };
}

/**
 * Reads a whole team. Pokémon are separated by blank lines; at most
 * `MAX_TEAM_SIZE` are kept. Text with nothing usable gives no sets.
 */
export function importTeam(text: string): ImportedTeam {
  const { name, blocks } = splitBlocks(text);
  const sets: PokemonSet[] = [];
  const warnings: string[] = [];
  let convertedFromEvs = false;
  let leftOut = 0;

  for (const block of blocks) {
    if (sets.length >= MAX_TEAM_SIZE) {
      leftOut += 1;
      continue;
    }
    const parsed = parseBlock(block);
    warnings.push(...parsed.warnings);
    if (!parsed.set) continue;
    sets.push(parsed.set);
    convertedFromEvs ||= parsed.convertedFromEvs;
  }
  if (leftOut > 0) {
    warnings.push(
      `A team holds ${MAX_TEAM_SIZE} Pokémon; ${leftOut} more ${leftOut === 1 ? "was" : "were"} left out.`,
    );
  }
  if (convertedFromEvs) warnings.push(EV_NOTICE);
  return { name, gameTeamId: readGameTeamIdFromText(text), sets, warnings };
}

/** Reads the first Pokémon in the text. */
export function importSet(text: string): ImportedSet {
  const first = splitBlocks(text).blocks[0];
  if (!first) return { set: null, warnings: [] };
  const parsed = parseBlock(first);
  const warnings = [...parsed.warnings];
  if (parsed.set && parsed.convertedFromEvs) warnings.push(EV_NOTICE);
  return { set: parsed.set, warnings };
}
