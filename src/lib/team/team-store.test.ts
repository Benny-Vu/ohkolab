import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultSet } from "@/data";
import { createTeam } from "@/lib/team/team-ops";
import {
  createLocalTeamStore,
  parseStoredTeams,
  sanitizeSet,
  sanitizeTeam,
  serializeTeams,
  TEAMS_BACKUP_KEY,
  TEAMS_STORAGE_KEY,
  TEAMS_STORAGE_VERSION,
} from "@/lib/team/team-store";
import { MAX_TEAM_SIZE } from "@/types/team";

function team(name: string, ...species: string[]) {
  return createTeam({
    name,
    format: "doubles",
    members: species.map(createDefaultSet),
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe("parseStoredTeams", () => {
  it("reads back what serializeTeams wrote", () => {
    const teams = [team("One", "Garchomp", "Incineroar"), team("Two")];
    const raw = serializeTeams(teams);
    expect(JSON.parse(raw)).toMatchObject({ version: TEAMS_STORAGE_VERSION });
    expect(parseStoredTeams(raw)).toEqual({ teams, unreadable: false });
  });

  it("gives no teams when nothing is stored", () => {
    expect(parseStoredTeams(null)).toEqual({ teams: [], unreadable: false });
  });

  it.each([
    ["text that is not JSON", "{not json"],
    ["an empty string", ""],
    ["a bare array", "[]"],
    ["null", "null"],
    ["a number", "42"],
    ["a missing version", JSON.stringify({ teams: [] })],
    ["a newer version", JSON.stringify({ version: 2, teams: [] })],
    ["teams that are not a list", JSON.stringify({ version: 1, teams: {} })],
  ])("treats %s as unreadable without throwing", (_, raw) => {
    expect(parseStoredTeams(raw)).toEqual({ teams: [], unreadable: true });
  });

  it("drops broken teams and members but keeps the good ones", () => {
    const good = team("Good", "Garchomp");
    const raw = JSON.stringify({
      version: 1,
      teams: [
        null,
        "a string",
        { name: "No id" },
        good,
        { ...good, name: "Same id again" },
        {
          id: "b",
          name: 12,
          format: "triples",
          members: [null, 3, { item: "Life Orb" }, { species: "Pikachu" }],
          createdAt: "yesterday-ish",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
    });
    const { teams, unreadable } = parseStoredTeams(raw);
    expect(unreadable).toBe(false);
    expect(teams).toHaveLength(2);
    expect(teams[0]).toEqual(good);
    expect(teams[1]).toEqual({
      id: "b",
      name: "Untitled team",
      format: "doubles",
      members: [
        {
          species: "Pikachu",
          item: null,
          ability: null,
          nature: "Hardy",
          statPoints: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          moves: [null, null, null, null],
        },
      ],
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    });
  });
});

describe("sanitizeSet", () => {
  it("repairs the shape of a damaged set", () => {
    expect(
      sanitizeSet({
        species: "Garchomp",
        nickname: "Chomper",
        item: 5,
        ability: "Rough Skin",
        nature: null,
        statPoints: { hp: "4", atk: 32.9, def: -3, spa: Number.NaN, spe: 12 },
        moves: ["Earthquake", 7, "", "Protect", "Dragon Claw", "Rock Slide"],
        gender: "X",
        level: 100,
      }),
    ).toEqual({
      species: "Garchomp",
      nickname: "Chomper",
      item: null,
      ability: "Rough Skin",
      nature: "Hardy",
      statPoints: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 12 },
      moves: ["Earthquake", null, null, "Protect"],
    });
  });

  it("keeps a valid set as it is", () => {
    const set = {
      ...createDefaultSet("Garchomp"),
      nickname: "Chomper",
      gender: "F" as const,
    };
    expect(sanitizeSet(set)).toEqual(set);
  });

  it("rejects anything without a species", () => {
    expect(sanitizeSet(null)).toBeNull();
    expect(sanitizeSet([])).toBeNull();
    expect(sanitizeSet({ species: "" })).toBeNull();
    expect(sanitizeSet({ species: 25 })).toBeNull();
  });
});

describe("sanitizeTeam", () => {
  it("caps the members at the team size and fills in missing dates", () => {
    const result = sanitizeTeam({
      id: "a",
      members: Array.from({ length: 9 }, () => ({ species: "Pikachu" })),
    });
    expect(result?.members).toHaveLength(MAX_TEAM_SIZE);
    expect(result?.createdAt).toBe(new Date(0).toISOString());
    expect(result?.updatedAt).toBe(new Date(0).toISOString());
  });
});

describe("local team store", () => {
  it("saves, lists, gets and deletes teams in local storage", () => {
    const store = createLocalTeamStore();
    expect(store.list()).toEqual([]);

    const one = team("One", "Garchomp");
    const two = team("Two");
    store.save(one);
    store.save(two);
    expect(store.list()).toEqual([one, two]);
    expect(store.get(two.id)).toEqual(two);
    expect(store.get("missing")).toBeUndefined();
    expect(JSON.parse(localStorage.getItem(TEAMS_STORAGE_KEY) ?? "")).toEqual({
      version: 1,
      teams: [one, two],
    });

    store.save({ ...one, name: "One again" });
    expect(store.list().map((saved) => saved.name)).toEqual([
      "One again",
      "Two",
    ]);

    store.delete(one.id);
    expect(store.list()).toEqual([two]);
    store.delete("missing");
    expect(store.list()).toEqual([two]);
  });

  it("returns the same snapshot until something changes", () => {
    const store = createLocalTeamStore();
    store.save(team("One"));
    const first = store.list();
    expect(store.list()).toBe(first);
    store.save(team("Two"));
    expect(store.list()).not.toBe(first);
  });

  it("reads teams another store instance (or tab) saved", () => {
    const here = createLocalTeamStore();
    const there = createLocalTeamStore();
    expect(here.list()).toEqual([]);
    const saved = team("Elsewhere", "Pikachu");
    there.save(saved);
    expect(here.list()).toEqual([saved]);
  });

  it("tells subscribers about changes, including ones from other tabs", () => {
    const store = createLocalTeamStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.save(team("One"));
    expect(listener).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new StorageEvent("storage", { key: TEAMS_STORAGE_KEY }),
    );
    expect(listener).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new StorageEvent("storage", { key: "other" }));
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.save(team("Two"));
    window.dispatchEvent(
      new StorageEvent("storage", { key: TEAMS_STORAGE_KEY }),
    );
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("starts empty on corrupt data and backs it up before overwriting", () => {
    localStorage.setItem(TEAMS_STORAGE_KEY, "{corrupt");
    const store = createLocalTeamStore();
    expect(store.list()).toEqual([]);
    expect(localStorage.getItem(TEAMS_BACKUP_KEY)).toBeNull();

    const saved = team("Fresh");
    store.save(saved);
    expect(localStorage.getItem(TEAMS_BACKUP_KEY)).toBe("{corrupt");
    expect(store.list()).toEqual([saved]);
    expect(parseStoredTeams(localStorage.getItem(TEAMS_STORAGE_KEY))).toEqual({
      teams: [saved],
      unreadable: false,
    });
  });

  it("keeps working in memory when the storage refuses writes", () => {
    const store = createLocalTeamStore(() => ({
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    }));
    const saved = team("In memory");
    store.save(saved);
    expect(store.list()).toEqual([saved]);
    store.delete(saved.id);
    expect(store.list()).toEqual([]);
  });

  it("keeps working in memory when there is no storage at all", () => {
    const missing = createLocalTeamStore(() => undefined);
    const throwing = createLocalTeamStore(() => {
      throw new Error("SecurityError");
    });
    for (const store of [missing, throwing]) {
      expect(store.list()).toEqual([]);
      const saved = team("In memory");
      store.save(saved);
      expect(store.get(saved.id)).toEqual(saved);
    }
  });
});
