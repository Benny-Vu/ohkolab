import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createElement, type ReactNode } from "react";

import { createDefaultSet } from "@/data";
import type { AuthContextValue } from "@/lib/auth/types";
import { AuthContext, GUEST_AUTH } from "@/lib/auth/use-auth";
import type { TeamRow } from "@/lib/database.types";
import type { AppSupabaseClient } from "@/lib/supabase";
import { setTeamsSyncClient } from "@/lib/team/active-store";
import { createLocalTeamStore, TEAMS_STORAGE_KEY } from "@/lib/team/team-store";
import { createTeamActions, useTeams } from "@/lib/team/use-teams";

type LoadResult = { data: TeamRow[] | null; error: { message: string } | null };

/** Minimal stand-in for the Supabase client behind the cloud team store. */
function createFakeClient(
  options: { rows?: TeamRow[]; loadError?: { message: string } | null } = {},
) {
  let loadResult: LoadResult = {
    data: options.rows ?? [],
    error: options.loadError ?? null,
  };
  const client = {
    from() {
      return {
        select() {
          return {
            eq() {
              return Promise.resolve(loadResult);
            },
          };
        },
        upsert() {
          return Promise.resolve({ error: null });
        },
        delete() {
          return { eq: () => Promise.resolve({ error: null }) };
        },
        insert() {
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return {
    client: client as unknown as AppSupabaseClient,
    setLoadResult(result: LoadResult) {
      loadResult = result;
    },
  };
}

function row(partial: Partial<TeamRow> & { id: string }): TeamRow {
  return {
    user_id: "user-1",
    name: "Test team",
    data: [],
    format: "doubles",
    is_public: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

const SIGNED_IN_AUTH: AuthContextValue = {
  ...GUEST_AUTH,
  isConfigured: true,
  user: { id: "user-1" } as unknown as AuthContextValue["user"],
};

function SignedInWrapper({ children }: { children?: ReactNode }) {
  return createElement(
    AuthContext.Provider,
    { value: SIGNED_IN_AUTH },
    children,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  setTeamsSyncClient(null);
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

  it("restores a removed team as it was", () => {
    const store = createLocalTeamStore();
    const actions = createTeamActions(store);
    const team = actions.create({ name: "Original", format: "doubles" });

    actions.rename(team.id, "Renamed");
    const renamed = store.get(team.id) ?? team;
    actions.remove(team.id);
    expect(store.get(team.id)).toBeUndefined();

    actions.restore(renamed);
    expect(store.get(team.id)).toEqual(renamed);
  });

  it("toggles a team's public flag and ignores no-op changes", () => {
    const store = createLocalTeamStore();
    const actions = createTeamActions(store);
    const team = actions.create({ format: "doubles" });

    actions.setPublic(team.id, true);
    expect(store.get(team.id)?.isPublic).toBe(true);

    const before = store.list();
    actions.setPublic(team.id, true);
    expect(store.list()).toBe(before);

    actions.setPublic(team.id, false);
    expect(store.get(team.id)?.isPublic).toBe(false);

    const afterFalse = store.list();
    actions.setPublic("missing", true);
    expect(store.list()).toBe(afterFalse);
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

  it("syncs from the cloud store for a signed-in user", async () => {
    const { client } = createFakeClient({
      rows: [row({ id: "t-1", name: "Cloud team" })],
    });
    setTeamsSyncClient(client);

    const { result } = renderHook(() => useTeams(), {
      wrapper: SignedInWrapper,
    });

    expect(result.current.sync.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.sync.loading).toBe(false);
    });
    expect(result.current.teams.map((team) => team.name)).toEqual([
      "Cloud team",
    ]);
    expect(result.current.sync.error).toBeNull();
  });

  it("surfaces cloud load errors and retries", async () => {
    const { client, setLoadResult } = createFakeClient({
      loadError: { message: "boom" },
    });
    setTeamsSyncClient(client);

    const { result } = renderHook(() => useTeams(), {
      wrapper: SignedInWrapper,
    });

    await waitFor(() => {
      expect(result.current.sync.error).toBe(
        "Something went wrong. Try again.",
      );
    });

    setLoadResult({
      data: [row({ id: "t-1", name: "Recovered" })],
      error: null,
    });
    act(() => {
      result.current.sync.retry();
    });

    await waitFor(() => {
      expect(result.current.sync.error).toBeNull();
    });
    expect(result.current.teams.map((team) => team.name)).toEqual([
      "Recovered",
    ]);
  });

  it("reports no sync activity for guests", () => {
    const { result } = renderHook(() => useTeams());

    expect(result.current.sync.loading).toBe(false);
    expect(result.current.sync.error).toBeNull();

    act(() => {
      result.current.sync.retry();
    });
    expect(result.current.teams).toEqual([]);
  });
});
