import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppSupabaseClient } from "@/lib/supabase";
import type { TeamRow } from "@/lib/database.types";
import {
  createCloudTeamStore,
  getCloudTeamStore,
  isCloudTeamStore,
} from "@/lib/team/cloud-team-store";
import { localTeamStore } from "@/lib/team/team-store";
import { createTeam } from "@/lib/team/team-ops";
import { createDefaultSet } from "@/data";

type LoadResult = { data: TeamRow[] | null; error: { message: string } | null };

interface FakeClientOptions {
  rows?: TeamRow[];
  loadError?: { message: string } | null;
}

/**
 * Minimal stand-in for the parts of the Supabase client the cloud store
 * touches: `from("teams")` with select/upsert/delete/insert chains.
 */
function createFakeClient(options: FakeClientOptions = {}) {
  const calls = {
    select: [] as string[][],
    upserts: [] as unknown[],
    deletes: [] as string[][],
    inserts: [] as unknown[],
  };
  let loadResult: LoadResult = {
    data: options.rows ?? [],
    error: options.loadError ?? null,
  };
  const client = {
    from() {
      return {
        select() {
          calls.select.push([]);
          return {
            eq() {
              return Promise.resolve(loadResult);
            },
          };
        },
        upsert(payload: unknown) {
          calls.upserts.push(payload);
          return Promise.resolve({ error: null });
        },
        delete() {
          return {
            eq(column: string, value: string) {
              calls.deletes.push([column, value]);
              return Promise.resolve({ error: null });
            },
          };
        },
        insert(payload: unknown) {
          calls.inserts.push(payload);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return {
    client: client as unknown as AppSupabaseClient,
    calls,
    setLoadResult(result: LoadResult) {
      loadResult = result;
    },
  };
}

/** A client whose select never settles, for loading-state tests. */
function createPendingClient() {
  const client = {
    from() {
      return {
        select() {
          return {
            eq() {
              return new Promise(() => {});
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
  return client as unknown as AppSupabaseClient;
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

function team(name: string, ...species: string[]) {
  return createTeam({
    name,
    format: "doubles",
    members: species.map((s) => createDefaultSet(s)),
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe("createCloudTeamStore", () => {
  it("publishes the loading state before the first load settles", () => {
    const client = createPendingClient();

    const store = createCloudTeamStore(client, "user-1");

    expect(store.syncState().status).toBe("loading");
    expect(store.list()).toEqual([]);
  });

  it("loads rows into a ready sync state, sorted by createdAt", async () => {
    const newer = row({
      id: "t-new",
      name: "Newer",
      created_at: "2026-02-01T00:00:00.000Z",
    });
    const older = row({
      id: "t-old",
      name: "Older",
      created_at: "2026-01-01T00:00:00.000Z",
    });
    const { client } = createFakeClient({ rows: [newer, older] });

    const store = createCloudTeamStore(client, "user-1");

    await vi.waitFor(() => {
      expect(store.syncState().status).toBe("ready");
    });
    expect(store.list().map((t) => t.id)).toEqual(["t-old", "t-new"]);
    expect(store.syncState().message).toBeNull();
    expect(store.syncState().unsynced).toEqual([]);
  });

  it("drops unusable rows and keeps isPublic from the row", async () => {
    const good = row({ id: "t-good", is_public: true });
    const { client } = createFakeClient({
      rows: [good, { ...good, id: "", name: "Broken" }],
    });

    const store = createCloudTeamStore(client, "user-1");

    await vi.waitFor(() => {
      expect(store.syncState().status).toBe("ready");
    });
    const teams = store.list();
    expect(teams).toHaveLength(1);
    expect(teams[0]?.isPublic).toBe(true);
  });

  it("reports a load error and retry reloads", async () => {
    const { client, calls, setLoadResult } = createFakeClient({
      loadError: { message: "boom" },
    });

    const store = createCloudTeamStore(client, "user-1");

    await vi.waitFor(() => {
      expect(store.syncState().status).toBe("error");
    });
    expect(store.syncState().message).toBe("Something went wrong. Try again.");
    expect(store.list()).toEqual([]);

    setLoadResult({ data: [row({ id: "t-1" })], error: null });
    store.retry();

    await vi.waitFor(() => {
      expect(store.syncState().status).toBe("ready");
    });
    expect(calls.select).toHaveLength(2);
  });

  it("flushes saves as upserts with fresh timestamps", async () => {
    const { client, calls } = createFakeClient();
    const store = createCloudTeamStore(client, "user-1");
    await vi.waitFor(() => {
      expect(store.syncState().status).toBe("ready");
    });

    const saved = team("My team", "garchomp");
    store.save(saved);

    await vi.waitFor(() => {
      expect(calls.upserts).toHaveLength(1);
    });
    expect(calls.upserts[0]).toEqual({
      id: saved.id,
      name: "My team",
      data: saved.members,
      format: "doubles",
      is_public: false,
      created_at: saved.createdAt,
      updated_at: expect.any(String),
    });
    await vi.waitFor(() => {
      expect(store.syncState().unsynced).toEqual([]);
    });
  });

  it("flushes deletes with an id filter", async () => {
    const existing = row({ id: "t-1" });
    const { client, calls } = createFakeClient({ rows: [existing] });
    const store = createCloudTeamStore(client, "user-1");
    await vi.waitFor(() => {
      expect(store.syncState().status).toBe("ready");
    });

    store.delete("t-1");

    await vi.waitFor(() => {
      expect(calls.deletes).toHaveLength(1);
    });
    expect(calls.deletes[0]).toEqual(["id", "t-1"]);
    expect(store.list()).toEqual([]);
    await vi.waitFor(() => {
      expect(store.syncState().unsynced).toEqual([]);
    });
  });

  it("keeps failed writes queued, reports them and calls onWriteError once", async () => {
    const { client } = createFakeClient();
    const onWriteError = vi.fn();
    const store = createCloudTeamStore(client, "user-1", { onWriteError });
    await vi.waitFor(() => {
      expect(store.syncState().status).toBe("ready");
    });

    const failing = client as unknown as {
      from: (table: string) => {
        upsert: (payload: unknown) => Promise<{ error: unknown }>;
      };
    };
    const originalFrom = failing.from.bind(failing);
    failing.from = (table: string) => {
      const chain = originalFrom(table);
      return {
        ...chain,
        upsert: () => Promise.resolve({ error: { message: "write failed" } }),
      };
    };

    const saved = team("Stuck team");
    store.save(saved);

    await vi.waitFor(() => {
      expect(onWriteError).toHaveBeenCalledTimes(1);
    });
    expect(onWriteError.mock.calls[0]).toHaveLength(1);
    expect(store.syncState().unsynced).toEqual([saved.id]);
    expect(store.list()).toEqual([saved]);

    failing.from = originalFrom;
    (onWriteError.mock.calls[0] as unknown as [() => void])[0]();

    await vi.waitFor(() => {
      expect(store.syncState().unsynced).toEqual([]);
    });
  });

  it("applies the last write for a team when saves overlap", async () => {
    const { client, calls } = createFakeClient();
    const store = createCloudTeamStore(client, "user-1");
    await vi.waitFor(() => {
      expect(store.syncState().status).toBe("ready");
    });

    const base = team("Base", "garchomp");
    store.save(base);
    const renamed = { ...base, name: "Renamed" };
    store.save(renamed);

    await vi.waitFor(() => {
      expect(store.syncState().unsynced).toEqual([]);
    });
    const names = calls.upserts.map((p) => (p as { name: string }).name);
    expect(names[names.length - 1]).toBe("Renamed");
    expect(store.list()[0]?.name).toBe("Renamed");
  });

  it("copies local teams once on first load", async () => {
    const local = team("Local only", "lucario");
    localTeamStore.save(local);
    const { client, calls } = createFakeClient();

    const store = createCloudTeamStore(client, "user-1");

    await vi.waitFor(() => {
      expect(store.syncState().status).toBe("ready");
    });
    expect(calls.inserts).toHaveLength(1);
    const inserted = calls.inserts[0] as {
      id: string;
      user_id: string;
      is_public: boolean;
    }[];
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      id: local.id,
      user_id: "user-1",
      is_public: false,
    });
    expect(store.list().map((t) => t.id)).toContain(local.id);

    const second = createCloudTeamStore(client, "user-1");
    await vi.waitFor(() => {
      expect(second.syncState().status).toBe("ready");
    });
    expect(calls.inserts).toHaveLength(1);
  });
});

describe("isCloudTeamStore", () => {
  it("recognizes cloud stores and rejects local ones", async () => {
    const { client } = createFakeClient();
    const store = createCloudTeamStore(client, "user-1");
    expect(isCloudTeamStore(store)).toBe(true);
    expect(isCloudTeamStore(localTeamStore)).toBe(false);
  });
});

describe("getCloudTeamStore", () => {
  it("returns the same store per client and user", async () => {
    const { client: clientA } = createFakeClient();
    const { client: clientB } = createFakeClient();

    const first = getCloudTeamStore(clientA, "user-1");
    const again = getCloudTeamStore(clientA, "user-1");
    const otherUser = getCloudTeamStore(clientA, "user-2");
    const otherClient = getCloudTeamStore(clientB, "user-1");

    expect(again).toBe(first);
    expect(otherUser).not.toBe(first);
    expect(otherClient).not.toBe(first);
  });
});
