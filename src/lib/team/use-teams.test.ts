import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { createDefaultSet } from "@/data";
import { createLocalTeamStore, TEAMS_STORAGE_KEY } from "@/lib/team/team-store";
import { createTeamActions, useTeams } from "@/lib/team/use-teams";

beforeEach(() => {
  localStorage.clear();
});

describe("createTeamActions", () => {
  it("creates, renames, reformats, duplicates and removes teams", () => {
    const store = createLocalTeamStore();
    const actions = createTeamActions(store);

    const team = actions.create({ name: "Rain", format: "doubles" });
    expect(store.get(team.id)).toEqual(team);

    actions.rename(team.id, "Heavy rain");
    actions.setFormat(team.id, "singles");
    expect(store.get(team.id)).toMatchObject({
      name: "Heavy rain",
      format: "singles",
    });

    const copy = actions.duplicate(team.id);
    expect(copy?.name).toBe("Heavy rain (copy)");
    expect(actions.duplicate(team.id)?.name).toBe("Heavy rain (copy 2)");
    expect(store.list()).toHaveLength(3);

    actions.remove(team.id);
    expect(store.get(team.id)).toBeUndefined();
    expect(store.list()).toHaveLength(2);
  });

  it("adds, updates, moves and removes members", () => {
    const store = createLocalTeamStore();
    const actions = createTeamActions(store);
    const { id } = actions.create({ format: "doubles" });
    const species = () =>
      store.get(id)?.members.map((member) => member.species);

    actions.addMember(id, createDefaultSet("Garchomp"));
    actions.addMember(id, createDefaultSet("Incineroar"));
    actions.addMember(id, createDefaultSet("Pikachu"));
    expect(species()).toEqual(["Garchomp", "Incineroar", "Pikachu"]);

    actions.updateMember(id, 0, {
      ...createDefaultSet("Garchomp"),
      item: "Life Orb",
    });
    expect(store.get(id)?.members[0]?.item).toBe("Life Orb");

    actions.moveMember(id, 2, 0);
    expect(species()).toEqual(["Pikachu", "Garchomp", "Incineroar"]);

    actions.removeMember(id, 1);
    expect(species()).toEqual(["Pikachu", "Incineroar"]);

    actions.setMembers(id, [createDefaultSet("Gengar")]);
    expect(species()).toEqual(["Gengar"]);
  });

  it("ignores unknown team ids and changes that change nothing", () => {
    const store = createLocalTeamStore();
    const actions = createTeamActions(store);
    const team = actions.create({ format: "doubles" });
    const before = store.list();

    actions.rename("missing", "Nope");
    actions.addMember("missing", createDefaultSet("Garchomp"));
    actions.remove("missing");
    actions.moveMember(team.id, 0, 3);
    expect(actions.duplicate("missing")).toBeUndefined();
    expect(store.list()).toBe(before);
  });
});

describe("useTeams", () => {
  it("re-renders with the teams as they change and persists them", () => {
    const { result } = renderHook(() => useTeams());
    expect(result.current.teams).toEqual([]);

    let id = "";
    act(() => {
      id = result.current.create({ name: "Sun", format: "singles" }).id;
    });
    expect(result.current.teams).toHaveLength(1);
    expect(result.current.teams[0]).toMatchObject({ id, name: "Sun" });

    act(() => {
      result.current.addMember(id, createDefaultSet("Charizard"));
    });
    expect(result.current.teams[0]?.members[0]?.species).toBe("Charizard");
    expect(localStorage.getItem(TEAMS_STORAGE_KEY)).toContain("Charizard");

    act(() => {
      result.current.remove(id);
    });
    expect(result.current.teams).toEqual([]);
  });

  it("shares one list between components", () => {
    const first = renderHook(() => useTeams());
    const second = renderHook(() => useTeams());
    act(() => {
      first.result.current.create({ name: "Shared", format: "doubles" });
    });
    expect(second.result.current.teams.map((team) => team.name)).toEqual([
      "Shared",
    ]);
  });

  it("reads from the store it is given", () => {
    const store = createLocalTeamStore(() => undefined);
    store.save(
      createTeamActions(createLocalTeamStore(() => undefined)).create({
        name: "Elsewhere",
        format: "doubles",
      }),
    );
    const { result } = renderHook(() => useTeams(store));
    expect(result.current.teams.map((team) => team.name)).toEqual([
      "Elsewhere",
    ]);
    expect(localStorage.getItem(TEAMS_STORAGE_KEY)).toBeNull();
  });
});
