import { beforeEach, describe, expect, it } from "vitest";

import {
  NOTES_STORAGE_KEY,
  MAX_NOTE_HISTORY,
  addNotesMove,
  addNotesSpeedRelation,
  clearNotesHistory,
  deleteNotesHistoryEntry,
  getBattleNotesState,
  logNotesMove,
  logNotesText,
  migrateStoredNotes,
  notesSetHasContent,
  removeNotesSpeedRelation,
  removeNotesTurn,
  resetBattleNotesStore,
  revealNotesAbility,
  revealNotesItem,
  setNotesGame,
  setNotesMega,
  setNotesMyTeam,
  setNotesPreview,
  setNotesText,
  setNotesTurn,
  startNewNotesSet,
  toggleNotesBrought,
} from "@/features/battle/notes-store";
import { EMPTY_SPEED_FIELD } from "@/features/battle/speed-note";

/**
 * Battle notes storage: the versioned envelope, what parsing keeps and
 * drops, the size caps, and the best-of-3 carry-over. Everything runs
 * against the real store with a clean localStorage per test.
 */

function stored(): unknown {
  const raw = localStorage.getItem(NOTES_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function freshStore() {
  localStorage.clear();
  resetBattleNotesStore();
}

/** One archived set with real content: a preview and a long turn log. */
function archiveAHeavySet() {
  setNotesPreview(["Incineroar", "Garchomp"]);
  revealNotesItem("Incineroar", "Leftovers");
  for (let i = 0; i < 100; i += 1) {
    logNotesText("x".repeat(200));
  }
  startNewNotesSet();
}

describe("stored envelope", () => {
  beforeEach(freshStore);

  it("autosaves every change under the versioned envelope", () => {
    setNotesPreview(["Incineroar"]);
    revealNotesItem("Incineroar", "Leftovers");
    addNotesMove("Incineroar", "Flare Blitz");

    const envelope = stored() as {
      version: number;
      state: { current: { notes: Record<string, { item: string | null }> } };
    };
    expect(envelope.version).toBe(2);
    expect(envelope.state.current.notes["Incineroar"]?.item).toBe("Leftovers");
  });

  it("round-trips a live state through migrateStoredNotes", () => {
    setNotesPreview(["Incineroar", "Garchomp"]);
    revealNotesItem("Incineroar", "Leftovers");
    setNotesMega("Garchomp", true);
    toggleNotesBrought("Incineroar");
    logNotesMove("Incineroar", "Flare Blitz");

    const parsed = migrateStoredNotes(stored());
    expect(parsed).not.toBeNull();
    expect(parsed?.current.preview).toEqual(["Incineroar", "Garchomp"]);
    expect(parsed?.current.notes["Incineroar"]?.item).toBe("Leftovers");
    expect(parsed?.current.notes["Garchomp"]?.mega).toBe(true);
    expect(parsed?.current.brought).toEqual([
      { game: 1, species: ["Incineroar"] },
    ]);
    expect(parsed?.current.turns[0]).toMatchObject({
      turn: 1,
      move: "Flare Blitz",
      species: "Incineroar",
    });
    expect(parsed?.current.turn).toBe(2);
  });

  it("discards an envelope with an unknown version", () => {
    expect(migrateStoredNotes({ version: 999, state: {} })).toBeNull();
    localStorage.setItem(
      NOTES_STORAGE_KEY,
      JSON.stringify({ version: 999, state: { current: {} } }),
    );
    resetBattleNotesStore();
    expect(getBattleNotesState().current.preview).toEqual([]);
  });

  it("starts fresh on corrupt JSON instead of throwing", () => {
    localStorage.setItem(NOTES_STORAGE_KEY, "{not json");
    resetBattleNotesStore();
    expect(getBattleNotesState().current.preview).toEqual([]);
    // The store still works afterwards.
    setNotesPreview(["Garchomp"]);
    expect(getBattleNotesState().current.preview).toEqual(["Garchomp"]);
  });

  it("drops malformed pieces and keeps the valid ones", () => {
    const parsed = migrateStoredNotes({
      version: 2,
      state: {
        current: {
          id: "set-1",
          createdAt: 123,
          game: 7,
          turn: 0,
          preview: ["Garchomp", "Missingno", "Charizard-Mega-Y"],
          myTeam: [
            { species: "Garchomp", speed: 50000 },
            "junk",
            { species: "Incineroar", speed: 150 },
            { species: "Incineroar", speed: 200 },
          ],
          notes: {
            Garchomp: {
              item: "not an item",
              ability: "Rough Skin",
              moves: ["Earthquake", "not a move", "Earthquake"],
              mega: "yes",
              relations: [
                { kind: "warp", mineSpecies: "Incineroar", mineSpeed: 100 },
                { kind: "faster" },
                { kind: "faster", mineSpecies: "Missingno" },
                {
                  kind: "faster",
                  mineSpecies: "Incineroar",
                  mineSpeed: 99999,
                  field: { stageMine: 9 },
                },
              ],
              note: "x".repeat(500),
            },
          },
          brought: [{ game: 2, species: ["Garchomp", "Missingno"] }],
          turns: [{ turn: 3, move: "Earthquake", species: "Garchomp" }, 5],
        },
        history: [],
      },
    });
    expect(parsed).not.toBeNull();
    const set = parsed?.current;
    expect(set?.game).toBe(1);
    expect(set?.turn).toBe(1);
    expect(set?.preview).toEqual(["Garchomp"]);
    expect(set?.myTeam).toEqual([{ species: "Incineroar", speed: 150 }]);
    expect(set?.notes["Garchomp"]).toEqual({
      species: "Garchomp",
      item: null,
      ability: "Rough Skin",
      moves: ["Earthquake"],
      mega: false,
      relations: [
        {
          id: expect.any(String),
          kind: "faster",
          mineSpecies: "Incineroar",
          mineSpeed: null,
          field: { ...EMPTY_SPEED_FIELD },
        },
      ],
      note: "x".repeat(280),
    });
    expect(set?.brought).toEqual([{ game: 2, species: ["Garchomp"] }]);
    expect(set?.turns).toEqual([
      {
        id: expect.any(String),
        turn: 3,
        move: "Earthquake",
        species: "Garchomp",
        text: "",
      },
    ]);
  });

  it("upgrades version-1 speed chips into plain relations", () => {
    const parsed = migrateStoredNotes({
      version: 1,
      state: {
        current: {
          preview: ["Garchomp"],
          notes: {
            Garchomp: {
              speed: [
                { kind: "faster", other: "Incineroar" },
                { kind: "scarf", other: null },
                { kind: "slower", other: "Missingno" },
                { kind: "slower", other: "Charizard" },
              ],
            },
          },
        },
        history: [],
      },
    });
    expect(parsed).not.toBeNull();
    // faster/slower chips become plain relations with no Speed bound; the
    // scarf chips carried nothing that survives, so they drop out.
    expect(parsed?.current.notes["Garchomp"]?.relations).toEqual([
      {
        id: expect.any(String),
        kind: "faster",
        mineSpecies: "Incineroar",
        mineSpeed: null,
        field: { ...EMPTY_SPEED_FIELD },
      },
      {
        id: expect.any(String),
        kind: "slower",
        mineSpecies: "Charizard",
        mineSpeed: null,
        field: { ...EMPTY_SPEED_FIELD },
      },
    ]);
    expect(parsed?.current.myTeam).toBeNull();
  });
});

describe("caps", () => {
  beforeEach(freshStore);

  it("keeps at most the last 20 archived sets", () => {
    for (let i = 0; i < MAX_NOTE_HISTORY + 5; i += 1) {
      setNotesPreview(["Incineroar"]);
      startNewNotesSet();
    }
    const { history } = getBattleNotesState();
    expect(history.length).toBe(MAX_NOTE_HISTORY);
  });

  it("trims the oldest archives when the stored JSON is too large", () => {
    // 25 sets whose turn logs alone far exceed the byte cap together.
    for (let i = 0; i < 25; i += 1) {
      archiveAHeavySet();
    }
    const raw = localStorage.getItem(NOTES_STORAGE_KEY) ?? "";
    expect(raw.length).toBeLessThanOrEqual(128 * 1024);
    expect(JSON.parse(raw).state.history.length).toBeLessThan(MAX_NOTE_HISTORY);
  });
});

describe("best-of-3 carry-over", () => {
  beforeEach(freshStore);

  it("carries notes across games and keeps what was brought per game", () => {
    setNotesPreview(["Incineroar", "Garchomp"]);
    revealNotesItem("Incineroar", "Leftovers");
    toggleNotesBrought("Incineroar");

    setNotesGame(2);
    const { current } = getBattleNotesState();
    expect(current.game).toBe(2);
    // The note carried over; game 2's brought list starts empty.
    expect(current.notes["Incineroar"]?.item).toBe("Leftovers");
    expect(current.brought).toEqual([{ game: 1, species: ["Incineroar"] }]);

    toggleNotesBrought("Garchomp");
    expect(getBattleNotesState().current.brought).toEqual([
      { game: 1, species: ["Incineroar"] },
      { game: 2, species: ["Garchomp"] },
    ]);
  });

  it("ignores an out-of-range game", () => {
    setNotesGame(4);
    expect(getBattleNotesState().current.game).toBe(1);
  });
});

describe("archive and history", () => {
  beforeEach(freshStore);

  it("archives only a set that holds content", () => {
    expect(startNewNotesSet()).toBe(false);
    expect(getBattleNotesState().history).toEqual([]);

    setNotesPreview(["Garchomp"]);
    expect(startNewNotesSet()).toBe(true);
    const { current, history } = getBattleNotesState();
    expect(history).toHaveLength(1);
    expect(history[0]?.preview).toEqual(["Garchomp"]);
    expect(current.preview).toEqual([]);
    expect(notesSetHasContent(current)).toBe(false);
  });

  it("deletes one archived set and clears the rest", () => {
    setNotesPreview(["Garchomp"]);
    startNewNotesSet();
    setNotesPreview(["Incineroar"]);
    startNewNotesSet();

    const first = getBattleNotesState().history[0];
    expect(first?.preview).toEqual(["Incineroar"]);
    deleteNotesHistoryEntry(first?.id ?? "");
    expect(getBattleNotesState().history).toHaveLength(1);

    clearNotesHistory();
    expect(getBattleNotesState().history).toEqual([]);
  });
});

describe("turn log", () => {
  beforeEach(freshStore);

  it("logs quick lines at the current turn and steps the counter", () => {
    setNotesPreview(["Incineroar"]);
    addNotesMove("Incineroar", "Fake Out");
    logNotesMove("Incineroar", "Fake Out");
    logNotesMove("Incineroar", "Fake Out");

    const { current } = getBattleNotesState();
    expect(current.turns.map((line) => line.turn)).toEqual([1, 2]);
    expect(current.turn).toBe(3);
  });

  it("sets the turn counter and removes lines", () => {
    setNotesTurn(5);
    logNotesText("tailwind up");
    logNotesText("  padded  ");
    const { current } = getBattleNotesState();
    expect(current.turns).toEqual([
      {
        id: expect.any(String),
        turn: 5,
        move: null,
        species: null,
        text: "tailwind up",
      },
      {
        id: expect.any(String),
        turn: 5,
        move: null,
        species: null,
        text: "padded",
      },
    ]);

    removeNotesTurn(current.turns[0]?.id ?? "");
    expect(getBattleNotesState().current.turns).toHaveLength(1);
  });
});

describe("revealed fields", () => {
  beforeEach(freshStore);

  it("reveals, replaces and clears per field", () => {
    setNotesPreview(["Garchomp"]);
    revealNotesItem("Garchomp", "Choice Scarf");
    revealNotesAbility("Garchomp", "Rough Skin");
    addNotesMove("Garchomp", "Earthquake");
    addNotesMove("Garchomp", "Earthquake");
    addNotesSpeedRelation("Garchomp", {
      kind: "faster",
      mineSpecies: "Incineroar",
      mineSpeed: 169,
      field: { ...EMPTY_SPEED_FIELD },
    });
    addNotesSpeedRelation("Garchomp", {
      kind: "tie",
      mineSpecies: "Charizard",
      mineSpeed: null,
      field: { ...EMPTY_SPEED_FIELD, priority: true },
    });
    setNotesText("Garchomp", "scarf is real");

    let note = getBattleNotesState().current.notes["Garchomp"];
    expect(note).toMatchObject({
      item: "Choice Scarf",
      ability: "Rough Skin",
      moves: ["Earthquake"],
      note: "scarf is real",
    });
    expect(note?.relations).toEqual([
      {
        id: expect.any(String),
        kind: "faster",
        mineSpecies: "Incineroar",
        mineSpeed: 169,
        field: { ...EMPTY_SPEED_FIELD },
      },
      {
        id: expect.any(String),
        kind: "tie",
        mineSpecies: "Charizard",
        mineSpeed: null,
        field: { ...EMPTY_SPEED_FIELD, priority: true },
      },
    ]);

    removeNotesSpeedRelation("Garchomp", note?.relations[0]?.id ?? "");
    note = getBattleNotesState().current.notes["Garchomp"];
    expect(note?.relations).toHaveLength(1);
    expect(note?.relations[0]?.mineSpecies).toBe("Charizard");

    revealNotesItem("Garchomp", null);
    setNotesMega("Garchomp", true);
    note = getBattleNotesState().current.notes["Garchomp"];
    expect(note?.item).toBeNull();
    expect(note?.mega).toBe(true);
  });
});

describe("my team", () => {
  beforeEach(freshStore);

  it("stores the team validated and deduped, and clears back to null", () => {
    setNotesMyTeam([
      { species: "Incineroar", speed: 150 },
      { species: "Incineroar", speed: 999 },
      { species: "Missingno", speed: 100 },
      { species: "Garchomp", speed: -1 },
    ]);
    expect(getBattleNotesState().current.myTeam).toEqual([
      { species: "Incineroar", speed: 150 },
    ]);

    setNotesMyTeam([]);
    expect(getBattleNotesState().current.myTeam).toBeNull();
  });

  it("caps the relations per opponent", () => {
    setNotesPreview(["Garchomp"]);
    for (let i = 0; i < 10; i += 1) {
      addNotesSpeedRelation("Garchomp", {
        kind: "faster",
        mineSpecies: "Incineroar",
        mineSpeed: 150,
        field: { ...EMPTY_SPEED_FIELD },
      });
    }
    const note = getBattleNotesState().current.notes["Garchomp"];
    expect(note?.relations).toHaveLength(6);
  });
});
