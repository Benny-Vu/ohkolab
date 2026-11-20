import { useSyncExternalStore } from "react";

import { getAbility, getItem, getMove, getSpecies } from "@/data";
import { MAX_TEAM_SIZE } from "@/types/team";

import {
  EMPTY_SPEED_FIELD,
  type SpeedFieldState,
  type SpeedRelation,
} from "@/features/battle/speed-note";

/**
 * Battle notes: what the player saw in the match, one note per opponent
 * Pokémon — revealed item, ability and moves, a Mega flag, speed
 * relations and free text — plus a best-of-3 game counter, the four the
 * opponent brought each game, an optional turn log and the player's own
 * team (chosen once, so speed relations can name their Pokémon).
 *
 * Device-only by design: everything lives in localStorage under a versioned
 * envelope, autosaved on every change, wrapped in try/catch (private windows
 * throw), capped in size, and never sent anywhere. "New opponent" archives
 * the current set into a history of the last 20.
 */

export const NOTES_STORAGE_KEY = "ohkolab:battle:notes";
const STORAGE_VERSION = 2;

/** How many archived sets the history keeps. */
export const MAX_NOTE_HISTORY = 20;
/** The most a stored set may hold, so one set can never blow the cap alone. */
const MAX_NOTE_LENGTH = 280;
const MAX_TURN_LINES = 100;
const MAX_TURN_TEXT = 200;
const MAX_SPEED_RELATIONS = 6;
const MAX_REVEALED_MOVES = 4;
const MAX_TURN = 999;
const MAX_STORED_SPEED = 10000;
/** Upper bound for the stored JSON; the oldest archives drop out first. */
const MAX_STORED_BYTES = 128 * 1024;

const GAMES = [1, 2, 3] as const;

/** One of my Pokémon the speed relations can name, with its Speed stat. */
export interface MyTeamMember {
  species: string;
  /** The Pokémon's Speed at level 50 from its set, before modifiers. */
  speed: number;
}

/** What was revealed about one opponent Pokémon. */
export interface SpeciesNote {
  species: string;
  item: string | null;
  ability: string | null;
  /** Revealed moves, in the order they were seen. */
  moves: string[];
  /** The opponent Mega-evolved this Pokémon. */
  mega: boolean;
  /** Speed relations against my Pokémon, newest last. */
  relations: SpeedRelation[];
  note: string;
}

/** One line of the turn log: a quick move line or free text. */
export interface TurnLine {
  id: string;
  turn: number;
  /** The quick line's move and species; null on a free-text line. */
  move: string | null;
  species: string | null;
  text: string;
}

/** Which four the opponent brought in one game of the set. */
export interface GameBrought {
  game: number;
  species: string[];
}

/** One opponent's notes: one match (a best-of-3 set) against one player. */
export interface NotesSet {
  id: string;
  createdAt: number;
  /** The game counter, 1 to 3. */
  game: number;
  /** The turn the next quick line is logged at. */
  turn: number;
  /** The team-preview six, so the notes work on their own page too. */
  preview: string[];
  /** My team for this set, with Speeds; null when none was chosen. */
  myTeam: MyTeamMember[] | null;
  notes: Record<string, SpeciesNote>;
  brought: GameBrought[];
  turns: TurnLine[];
}

/** The whole store: the set in progress plus the archived ones. */
export interface BattleNotesState {
  current: NotesSet;
  history: NotesSet[];
}

type Unknown = Record<string, unknown>;

function isRecord(value: unknown): value is Unknown {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

// --- Parsing: everything read back from storage is untrusted. ---

/** A team-legal roster species, or null. */
function validSpecies(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const info = getSpecies(raw);
  return info && !info.isBattleOnly ? info.name : null;
}

function validItem(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return getItem(raw)?.name ?? null;
}

function validAbility(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return getAbility(raw)?.name ?? null;
}

function validMove(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return getMove(raw)?.name ?? null;
}

function boundedText(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.slice(0, max) : "";
}

function validGame(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isInteger(raw)) return null;
  return GAMES.some((game) => game === raw) ? raw : null;
}

/** A stored Speed stat: a whole number a set can actually reach. */
function validSpeed(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const speed = Math.round(raw);
  return speed >= 0 && speed <= MAX_STORED_SPEED ? speed : null;
}

/** The field state a relation records, defaulting every toggle to off. */
function validField(raw: unknown): SpeedFieldState {
  const rec = isRecord(raw) ? raw : {};
  return {
    tailwindMine: rec.tailwindMine === true,
    tailwindTheirs: rec.tailwindTheirs === true,
    trickRoom: rec.trickRoom === true,
    paralyzedMine: rec.paralyzedMine === true,
    scarfMine: rec.scarfMine === true,
    stageMine:
      typeof rec.stageMine === "number" &&
      Number.isFinite(rec.stageMine) &&
      rec.stageMine >= -6 &&
      rec.stageMine <= 6
        ? Math.round(rec.stageMine)
        : 0,
    priority: rec.priority === true,
  };
}

function parseRelation(raw: unknown): SpeedRelation | null {
  if (!isRecord(raw)) return null;
  const kind = raw.kind;
  if (kind !== "faster" && kind !== "slower" && kind !== "tie") return null;
  const mineSpecies = validSpecies(raw.mineSpecies);
  if (!mineSpecies) return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : newId(),
    kind,
    mineSpecies,
    mineSpeed: validSpeed(raw.mineSpeed),
    field: validField(raw.field),
  };
}

function parseNote(species: string, raw: unknown): SpeciesNote {
  const rec = isRecord(raw) ? raw : {};
  const moves: string[] = [];
  if (Array.isArray(rec.moves)) {
    for (const entry of rec.moves) {
      const move = validMove(entry);
      if (move && !moves.includes(move) && moves.length < MAX_REVEALED_MOVES) {
        moves.push(move);
      }
    }
  }
  const relations: SpeedRelation[] = [];
  if (Array.isArray(rec.relations)) {
    for (const entry of rec.relations) {
      const parsed = parseRelation(entry);
      if (parsed && relations.length < MAX_SPEED_RELATIONS) {
        relations.push(parsed);
      }
    }
  }
  return {
    species,
    item: validItem(rec.item),
    ability: validAbility(rec.ability),
    moves,
    mega: rec.mega === true,
    relations,
    note: boundedText(rec.note, MAX_NOTE_LENGTH),
  };
}

/** Parses a v1 note's "speed" chips into plain v2 relations. */
function upgradeChips(raw: unknown): SpeedRelation[] {
  const rec = isRecord(raw) ? raw : {};
  const relations: SpeedRelation[] = [];
  if (Array.isArray(rec.speed)) {
    for (const entry of rec.speed) {
      if (!isRecord(entry)) continue;
      const kind = entry.kind;
      if (kind !== "faster" && kind !== "slower") continue;
      const other = validSpecies(entry.other);
      if (!other) continue;
      relations.push({
        id: newId(),
        kind,
        mineSpecies: other,
        // v1 chips carried no speed, so these stay plain notes.
        mineSpeed: null,
        field: { ...EMPTY_SPEED_FIELD },
      });
    }
  }
  return relations.slice(0, MAX_SPEED_RELATIONS);
}

function parseTurnLine(raw: unknown): TurnLine | null {
  if (!isRecord(raw)) return null;
  const move = validMove(raw.move);
  const species = validSpecies(raw.species);
  const text = boundedText(raw.text, MAX_TURN_TEXT);
  // A quick line needs both a move and a species; a free line needs text.
  const quick = move !== null && species !== null;
  if (!quick && text === "") return null;
  const turn =
    typeof raw.turn === "number" && Number.isFinite(raw.turn)
      ? Math.min(MAX_TURN, Math.max(1, Math.round(raw.turn)))
      : 1;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : newId(),
    turn,
    move: quick ? move : null,
    species: quick ? species : null,
    text: quick ? "" : text,
  };
}

function parseMyTeam(raw: unknown): MyTeamMember[] | null {
  if (!Array.isArray(raw)) return null;
  const team: MyTeamMember[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const species = validSpecies(entry.species);
    const speed = validSpeed(entry.speed);
    if (!species || speed === null) continue;
    if (!team.some((member) => member.species === species)) {
      team.push({ species, speed });
    }
    if (team.length >= MAX_TEAM_SIZE) break;
  }
  return team.length > 0 ? team : null;
}

/** Two parsed teams are the same list, or both absent. */
function sameMyTeam(
  next: MyTeamMember[] | null,
  stored: MyTeamMember[] | null,
): boolean {
  if (next === null || stored === null) return next === stored;
  return (
    next.length === stored.length &&
    next.every(
      (member, index) =>
        member.species === stored[index]?.species &&
        member.speed === stored[index]?.speed,
    )
  );
}

function parseSet(raw: unknown, legacy = false): NotesSet {
  const rec = isRecord(raw) ? raw : {};
  const preview: string[] = [];
  if (Array.isArray(rec.preview)) {
    for (const entry of rec.preview) {
      const species = validSpecies(entry);
      if (
        species &&
        !preview.includes(species) &&
        preview.length < MAX_TEAM_SIZE
      ) {
        preview.push(species);
      }
    }
  }
  const notes: Record<string, SpeciesNote> = {};
  const rawNotes = isRecord(rec.notes) ? rec.notes : {};
  for (const [key, value] of Object.entries(rawNotes)) {
    const species = validSpecies(key);
    if (species) {
      const note = parseNote(species, value);
      // v1 sets kept speed chips; they become plain relations without a
      // bound, so nothing the player wrote is lost on upgrade.
      if (legacy) note.relations = upgradeChips(value);
      notes[species] = note;
    }
  }
  const brought: GameBrought[] = [];
  if (Array.isArray(rec.brought)) {
    for (const entry of rec.brought) {
      if (!isRecord(entry)) continue;
      const game = validGame(entry.game);
      if (!game || brought.some((existing) => existing.game === game)) continue;
      const species: string[] = [];
      if (Array.isArray(entry.species)) {
        for (const name of entry.species) {
          const valid = validSpecies(name);
          if (valid && !species.includes(valid)) species.push(valid);
        }
      }
      brought.push({ game, species });
    }
  }
  const turns: TurnLine[] = [];
  if (Array.isArray(rec.turns)) {
    for (const line of rec.turns) {
      const parsed = parseTurnLine(line);
      if (parsed && turns.length < MAX_TURN_LINES) turns.push(parsed);
    }
  }
  return {
    id: typeof rec.id === "string" && rec.id ? rec.id : newId(),
    createdAt:
      typeof rec.createdAt === "number" && Number.isFinite(rec.createdAt)
        ? rec.createdAt
        : Date.now(),
    game: validGame(rec.game) ?? 1,
    turn:
      typeof rec.turn === "number" && Number.isFinite(rec.turn)
        ? Math.min(MAX_TURN, Math.max(1, Math.round(rec.turn)))
        : 1,
    preview,
    myTeam: legacy ? null : parseMyTeam(rec.myTeam),
    notes,
    brought,
    turns,
  };
}

/**
 * Reads a stored envelope from any schema version and brings it to the
 * current one, or returns null when nothing usable is stored (corrupt JSON
 * never reaches here — the caller catches that). Version 1 sets upgrade in
 * place: their speed chips become plain relations, and they had no team.
 */
export function migrateStoredNotes(raw: unknown): BattleNotesState | null {
  if (!isRecord(raw)) return null;
  const legacy = raw.version === 1;
  if (!legacy && raw.version !== STORAGE_VERSION) return null;
  const state = raw.state;
  if (!isRecord(state)) return null;
  const history = Array.isArray(state.history)
    ? state.history
        .map((entry) => parseSet(entry, legacy))
        .slice(0, MAX_NOTE_HISTORY)
    : [];
  return { current: parseSet(state.current, legacy), history };
}

// --- The store: one module-level snapshot, autosaved on every change. ---

/** A fresh, empty set: game 1, turn 1, nothing noted. */
export function createEmptyNotesSet(now: number = Date.now()): NotesSet {
  return {
    id: newId(),
    createdAt: now,
    game: 1,
    turn: 1,
    preview: [],
    myTeam: null,
    notes: {},
    brought: [],
    turns: [],
  };
}

function readStored(): BattleNotesState {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (raw) return migrateStoredNotes(JSON.parse(raw)) ?? emptyState();
  } catch {
    // Blocked or corrupted storage: start with no notes.
  }
  return emptyState();
}

function emptyState(): BattleNotesState {
  return { current: createEmptyNotesSet(), history: [] };
}

/**
 * The cached snapshot. Always a distinct object per change (never a
 * mutation), so `useSyncExternalStore` sees a new reference and re-renders.
 */
let cache: BattleNotesState | null = null;

function current(): BattleNotesState {
  cache ??= readStored();
  return cache;
}

function persist(next: BattleNotesState): void {
  // The size cap: the oldest archives drop out until the JSON fits.
  let history = next.history.slice(0, MAX_NOTE_HISTORY);
  try {
    let json = JSON.stringify({
      version: STORAGE_VERSION,
      state: { current: next.current, history },
    });
    while (json.length > MAX_STORED_BYTES && history.length > 0) {
      history = history.slice(0, -1);
      json = JSON.stringify({
        version: STORAGE_VERSION,
        state: { current: next.current, history },
      });
    }
  } catch {
    // JSON.stringify cannot fail on this data; keep the full history.
  }
  cache = { current: next.current, history };
  try {
    localStorage.setItem(
      NOTES_STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, state: cache }),
    );
  } catch {
    // Storage full or unavailable: the notes still hold for this session.
  }
}

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function updateCurrent(update: (set: NotesSet) => NotesSet): void {
  const state = current();
  persist({ ...state, current: update(state.current) });
  notify();
}

function noteOf(set: NotesSet, species: string): SpeciesNote {
  return (
    set.notes[species] ?? {
      species,
      item: null,
      ability: null,
      moves: [],
      mega: false,
      relations: [],
      note: "",
    }
  );
}

function withNote(set: NotesSet, note: SpeciesNote): NotesSet {
  return { ...set, notes: { ...set.notes, [note.species]: note } };
}

// --- Actions. Plain functions: the hook only subscribes. ---

/** Sets the team-preview six (the battle page syncs its opponent list in). */
export function setNotesPreview(species: readonly string[]): void {
  const preview: string[] = [];
  for (const name of species) {
    const valid = validSpecies(name);
    if (valid && !preview.includes(valid) && preview.length < MAX_TEAM_SIZE) {
      preview.push(valid);
    }
  }
  updateCurrent((set) => ({ ...set, preview }));
}

/** Removes one Pokémon's card and its note. */
export function removeNotesSpecies(species: string): void {
  updateCurrent((set) => {
    const notes = { ...set.notes };
    delete notes[species];
    return {
      ...set,
      preview: set.preview.filter((name) => name !== species),
      notes,
    };
  });
}

/** Reveals (or clears) the held item. */
export function revealNotesItem(species: string, item: string | null): void {
  updateCurrent((set) =>
    withNote(set, {
      ...noteOf(set, species),
      item: item ? validItem(item) : null,
    }),
  );
}

/** Reveals (or clears) the ability. */
export function revealNotesAbility(
  species: string,
  ability: string | null,
): void {
  updateCurrent((set) =>
    withNote(set, {
      ...noteOf(set, species),
      ability: ability ? validAbility(ability) : null,
    }),
  );
}

/** Adds a revealed move, at most four per Pokémon. */
export function addNotesMove(species: string, move: string): void {
  updateCurrent((set) => {
    const note = noteOf(set, species);
    const valid = validMove(move);
    if (
      !valid ||
      note.moves.includes(valid) ||
      note.moves.length >= MAX_REVEALED_MOVES
    ) {
      return set;
    }
    return withNote(set, { ...note, moves: [...note.moves, valid] });
  });
}

/** Removes one revealed move. */
export function removeNotesMove(species: string, move: string): void {
  updateCurrent((set) => {
    const note = noteOf(set, species);
    if (!note.moves.includes(move)) return set;
    return withNote(set, {
      ...note,
      moves: note.moves.filter((m) => m !== move),
    });
  });
}

/** Sets the Mega-evolved flag. */
export function setNotesMega(species: string, mega: boolean): void {
  updateCurrent((set) => withNote(set, { ...noteOf(set, species), mega }));
}

/**
 * My team for this set, with each member's Speed from its set. Chosen
 * once (the battle page syncs its my-side team in); null clears it.
 * A no-op when the parsed team already matches, so re-syncing from a
 * render loop can never churn the store.
 */
export function setNotesMyTeam(members: readonly MyTeamMember[]): void {
  const next = parseMyTeam(members);
  if (sameMyTeam(next, current().current.myTeam)) return;
  updateCurrent((set) => ({ ...set, myTeam: next }));
}

/** Adds a speed relation to an opponent, at most a handful per Pokémon. */
export function addNotesSpeedRelation(
  species: string,
  relation: Omit<SpeedRelation, "id">,
): void {
  updateCurrent((set) => {
    const note = noteOf(set, species);
    if (note.relations.length >= MAX_SPEED_RELATIONS) return set;
    const parsed = parseRelation({ ...relation, id: newId() });
    if (!parsed) return set;
    return withNote(set, {
      ...note,
      relations: [...note.relations, parsed],
    });
  });
}

/** Removes one speed relation by id. */
export function removeNotesSpeedRelation(
  species: string,
  relationId: string,
): void {
  updateCurrent((set) => {
    const note = noteOf(set, species);
    return withNote(set, {
      ...note,
      relations: note.relations.filter(
        (existing) => existing.id !== relationId,
      ),
    });
  });
}

/** Sets the free-text note. */
export function setNotesText(species: string, text: string): void {
  updateCurrent((set) =>
    withNote(set, {
      ...noteOf(set, species),
      note: text.slice(0, MAX_NOTE_LENGTH),
    }),
  );
}

/** Switches the game counter; notes carry across games. */
export function setNotesGame(game: number): void {
  const valid = validGame(game);
  if (!valid) return;
  updateCurrent((set) => ({ ...set, game: valid }));
}

/** Toggles one of the preview six as brought in the current game. */
export function toggleNotesBrought(species: string): void {
  updateCurrent((set) => {
    const valid = validSpecies(species);
    if (!valid) return set;
    const entry = set.brought.find((game) => game.game === set.game);
    const list = entry?.species ?? [];
    const next = list.includes(valid)
      ? list.filter((name) => name !== valid)
      : [...list, valid];
    const brought = set.brought.filter((game) => game.game !== set.game);
    if (next.length > 0) brought.push({ game: set.game, species: next });
    brought.sort((a, b) => a.game - b.game);
    return { ...set, brought };
  });
}

/** Sets the turn the next quick line is logged at. */
export function setNotesTurn(turn: number): void {
  updateCurrent((set) => ({
    ...set,
    turn: Math.min(MAX_TURN, Math.max(1, Math.round(turn))),
  }));
}

/**
 * Logs a quick line "T{n}: move → species" from the moves already noted and
 * steps the turn counter.
 */
export function logNotesMove(species: string, move: string): void {
  updateCurrent((set) => {
    const valid = validMove(move);
    const who = validSpecies(species);
    if (!valid || !who || set.turns.length >= MAX_TURN_LINES) return set;
    return {
      ...set,
      turns: [
        ...set.turns,
        { id: newId(), turn: set.turn, move: valid, species: who, text: "" },
      ],
      turn: Math.min(MAX_TURN, set.turn + 1),
    };
  });
}

/** Logs a free-text line at the current turn. */
export function logNotesText(text: string): void {
  updateCurrent((set) => {
    const trimmed = text.trim().slice(0, MAX_TURN_TEXT);
    if (!trimmed || set.turns.length >= MAX_TURN_LINES) return set;
    return {
      ...set,
      turns: [
        ...set.turns,
        {
          id: newId(),
          turn: set.turn,
          move: null,
          species: null,
          text: trimmed,
        },
      ],
    };
  });
}

/** Removes one turn-log line. */
export function removeNotesTurn(id: string): void {
  updateCurrent((set) => ({
    ...set,
    turns: set.turns.filter((line) => line.id !== id),
  }));
}

/** True when the set holds anything worth archiving. */
export function notesSetHasContent(set: NotesSet): boolean {
  return (
    set.preview.length > 0 ||
    set.turns.length > 0 ||
    set.brought.length > 0 ||
    Object.values(set.notes).some(
      (note) =>
        note.item !== null ||
        note.ability !== null ||
        note.moves.length > 0 ||
        note.mega ||
        note.relations.length > 0 ||
        note.note !== "",
    )
  );
}

/**
 * "New opponent": archives the current set into the history (only when it
 * holds anything) and starts a fresh one. Returns whether it archived.
 */
export function startNewNotesSet(): boolean {
  const state = current();
  const hadContent = notesSetHasContent(state.current);
  const history = hadContent
    ? [state.current, ...state.history].slice(0, MAX_NOTE_HISTORY)
    : state.history;
  persist({ current: createEmptyNotesSet(), history });
  notify();
  return hadContent;
}

/** Deletes one archived set. */
export function deleteNotesHistoryEntry(id: string): void {
  const state = current();
  persist({ ...state, history: state.history.filter((set) => set.id !== id) });
  notify();
}

/** Clears the whole history; the set in progress stays. */
export function clearNotesHistory(): void {
  persist({ ...current(), history: [] });
  notify();
}

/** The snapshot before the store has read anything (tests, first paint). */
const SERVER_SNAPSHOT: BattleNotesState = emptyState();

/** The battle notes as React state; re-renders on every change. */
export function useBattleNotesState(): BattleNotesState {
  return useSyncExternalStore(subscribe, current, () => SERVER_SNAPSHOT);
}

/** The current snapshot for non-React code (and tests). */
export function getBattleNotesState(): BattleNotesState {
  return current();
}

/** Drops the cache and re-reads storage. Tests use this for isolation. */
export function resetBattleNotesStore(): void {
  cache = null;
  notify();
}
