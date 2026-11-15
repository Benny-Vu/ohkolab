import { describe, expect, it } from "vitest";

import { createDefaultSet } from "@/data";
import {
  addMember,
  createTeam,
  DEFAULT_TEAM_NAME,
  duplicateTeam,
  moveMember,
  removeMember,
  renameTeam,
  setMembers,
  setTeamFormat,
  sortByUpdated,
  updateMember,
} from "@/lib/team/team-ops";
import { MAX_TEAM_SIZE } from "@/types/team";

const EARLY = new Date("2026-01-01T10:00:00.000Z");
const LATER = new Date("2026-01-02T10:00:00.000Z");

function teamOf(...species: string[]) {
  return createTeam(
    { name: "Rain", format: "doubles", members: species.map(createDefaultSet) },
    EARLY,
  );
}

function names(team: { members: { species: string }[] }) {
  return team.members.map((member) => member.species);
}

describe("createTeam", () => {
  it("makes an empty team with a UUID and matching timestamps", () => {
    const team = createTeam({ format: "singles" }, EARLY);
    expect(team.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(team).toMatchObject({
      name: DEFAULT_TEAM_NAME,
      format: "singles",
      members: [],
      createdAt: EARLY.toISOString(),
      updatedAt: EARLY.toISOString(),
    });
    expect(createTeam({ format: "singles" }).id).not.toBe(team.id);
  });

  it("trims the name and falls back when it is blank", () => {
    expect(createTeam({ name: "  Sun  ", format: "doubles" }).name).toBe("Sun");
    expect(createTeam({ name: "   ", format: "doubles" }).name).toBe(
      DEFAULT_TEAM_NAME,
    );
  });

  it("keeps at most a full team of members", () => {
    const species = Array.from({ length: 8 }, () => "Pikachu");
    expect(teamOf(...species).members).toHaveLength(MAX_TEAM_SIZE);
  });
});

describe("team changes", () => {
  it("renames and changes format without touching the input", () => {
    const team = teamOf("Garchomp");
    const renamed = renameTeam(team, "Sand", LATER);
    expect(renamed).toMatchObject({
      id: team.id,
      name: "Sand",
      createdAt: EARLY.toISOString(),
      updatedAt: LATER.toISOString(),
    });
    expect(setTeamFormat(team, "singles", LATER).format).toBe("singles");
    expect(team.name).toBe("Rain");
    expect(team.format).toBe("doubles");
    expect(team.updatedAt).toBe(EARLY.toISOString());
  });

  it("duplicates under a new id with a free name and its own members", () => {
    const team = teamOf("Garchomp", "Incineroar");
    const copy = duplicateTeam(team, ["Rain"], LATER);
    expect(copy.id).not.toBe(team.id);
    expect(copy.name).toBe("Rain (copy)");
    expect(copy.createdAt).toBe(LATER.toISOString());
    expect(copy.members).toEqual(team.members);
    expect(copy.members[0]).not.toBe(team.members[0]);
    expect(copy.members[0]?.statPoints).not.toBe(team.members[0]?.statPoints);

    expect(duplicateTeam(team, ["Rain", "Rain (copy)"]).name).toBe(
      "Rain (copy 2)",
    );
    expect(
      duplicateTeam(team, ["Rain (copy)", "Rain (copy 2)", "Rain (copy 3)"])
        .name,
    ).toBe("Rain (copy 4)");
    expect(duplicateTeam({ ...team, name: " " }).name).toBe(
      `${DEFAULT_TEAM_NAME} (copy)`,
    );
  });
});

describe("member changes", () => {
  it("adds members up to the team size", () => {
    let team = teamOf();
    for (const species of [
      "Garchomp",
      "Incineroar",
      "Pikachu",
      "Gengar",
      "Tyranitar",
      "Rillaboom",
    ]) {
      team = addMember(team, createDefaultSet(species), LATER);
    }
    expect(team.members).toHaveLength(MAX_TEAM_SIZE);
    expect(team.updatedAt).toBe(LATER.toISOString());

    const full = addMember(team, createDefaultSet("Dragonite"));
    expect(full).toBe(team);
  });

  it("updates one member in place", () => {
    const team = teamOf("Garchomp", "Incineroar");
    const next = updateMember(
      team,
      1,
      { ...createDefaultSet("Incineroar"), item: "Sitrus Berry" },
      LATER,
    );
    expect(next.members[1]?.item).toBe("Sitrus Berry");
    expect(next.members[0]).toBe(team.members[0]);
    expect(next.updatedAt).toBe(LATER.toISOString());
    expect(team.members[1]?.item).toBeNull();
  });

  it("removes one member", () => {
    const team = teamOf("Garchomp", "Incineroar", "Pikachu");
    expect(names(removeMember(team, 1))).toEqual(["Garchomp", "Pikachu"]);
  });

  it("moves a member up, down and across the team", () => {
    const team = teamOf("Garchomp", "Incineroar", "Pikachu", "Gengar");
    expect(names(moveMember(team, 2, 1))).toEqual([
      "Garchomp",
      "Pikachu",
      "Incineroar",
      "Gengar",
    ]);
    expect(names(moveMember(team, 0, 3))).toEqual([
      "Incineroar",
      "Pikachu",
      "Gengar",
      "Garchomp",
    ]);
    expect(names(moveMember(team, 3, 0))).toEqual([
      "Gengar",
      "Garchomp",
      "Incineroar",
      "Pikachu",
    ]);
    expect(names(team)).toEqual([
      "Garchomp",
      "Incineroar",
      "Pikachu",
      "Gengar",
    ]);
  });

  it("ignores positions outside the team", () => {
    const team = teamOf("Garchomp", "Incineroar");
    const set = createDefaultSet("Pikachu");
    expect(updateMember(team, 2, set)).toBe(team);
    expect(updateMember(team, -1, set)).toBe(team);
    expect(removeMember(team, 5)).toBe(team);
    expect(removeMember(team, 0.5)).toBe(team);
    expect(moveMember(team, 0, 2)).toBe(team);
    expect(moveMember(team, -1, 0)).toBe(team);
    expect(moveMember(team, 1, 1)).toBe(team);
  });

  it("replaces the member list, capped at the team size", () => {
    const team = teamOf("Garchomp");
    const many = Array.from({ length: 9 }, () => createDefaultSet("Pikachu"));
    expect(setMembers(team, many).members).toHaveLength(MAX_TEAM_SIZE);
    expect(setMembers(team, []).members).toEqual([]);
  });
});

describe("sortByUpdated", () => {
  it("puts the most recently updated team first without reordering the input", () => {
    const old = teamOf("Garchomp");
    const recent = renameTeam(teamOf("Pikachu"), "Recent", LATER);
    const teams = [old, recent];
    expect(sortByUpdated(teams).map((team) => team.name)).toEqual([
      "Recent",
      "Rain",
    ]);
    expect(teams[0]).toBe(old);
  });
});
