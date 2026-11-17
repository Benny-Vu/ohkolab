import { beforeEach, describe, expect, it } from "vitest";

import type { AppSupabaseClient } from "@/lib/supabase";
import {
  copiedTeamsFlagKey,
  copyLocalTeamsToAccount,
} from "@/lib/team/copy-local-teams";
import { localTeamStore } from "@/lib/team/team-store";
import { createTeam } from "@/lib/team/team-ops";
import { createDefaultSet } from "@/data";

function createFakeClient() {
  const calls = {
    inserts: [] as unknown[],
  };
  const client = {
    from() {
      return {
        insert(payload: unknown) {
          calls.inserts.push(payload);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return { client: client as unknown as AppSupabaseClient, calls };
}

function createFailingClient() {
  const client = {
    from() {
      return {
        insert() {
          return Promise.resolve({ error: { message: "insert failed" } });
        },
      };
    },
  };
  return client as unknown as AppSupabaseClient;
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

describe("copiedTeamsFlagKey", () => {
  it("is scoped per user", () => {
    expect(copiedTeamsFlagKey("user-1")).toBe("ohkolab:teams:copied:user-1");
    expect(copiedTeamsFlagKey("user-2")).toBe("ohkolab:teams:copied:user-2");
  });
});

describe("copyLocalTeamsToAccount", () => {
  it("inserts local teams missing from the server and sets the flag", async () => {
    const local = team("Local team", "lucario");
    const alreadyOnServer = team("Already synced");
    localTeamStore.save(local);
    localTeamStore.save(alreadyOnServer);
    const { client, calls } = createFakeClient();

    const copied = await copyLocalTeamsToAccount(
      client,
      "user-1",
      new Set([alreadyOnServer.id]),
    );

    expect(copied).toHaveLength(1);
    expect(copied[0]).toMatchObject({ id: local.id, isPublic: false });
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
    expect(localStorage.getItem(copiedTeamsFlagKey("user-1"))).toBe("1");
  });

  it("skips the copy when nothing is missing", async () => {
    const local = team("Already synced");
    localTeamStore.save(local);
    const { client, calls } = createFakeClient();

    const copied = await copyLocalTeamsToAccount(
      client,
      "user-1",
      new Set([local.id]),
    );

    expect(copied).toEqual([]);
    expect(calls.inserts).toHaveLength(0);
    expect(localStorage.getItem(copiedTeamsFlagKey("user-1"))).toBe("1");
  });

  it("returns [] and leaves the flag unset when the insert fails", async () => {
    const local = team("Local team");
    localTeamStore.save(local);
    const client = createFailingClient();

    const copied = await copyLocalTeamsToAccount(client, "user-1", new Set());

    expect(copied).toEqual([]);
    expect(localStorage.getItem(copiedTeamsFlagKey("user-1"))).toBeNull();
  });

  it("does not insert again once the flag is set", async () => {
    const local = team("Local team");
    localTeamStore.save(local);
    const { client, calls } = createFakeClient();
    localStorage.setItem(copiedTeamsFlagKey("user-1"), "1");

    const copied = await copyLocalTeamsToAccount(client, "user-1", new Set());

    expect(copied).toEqual([]);
    expect(calls.inserts).toHaveLength(0);
  });
});
