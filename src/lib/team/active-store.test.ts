import { afterEach, describe, expect, it } from "vitest";

import type { AppSupabaseClient } from "@/lib/supabase";
import {
  setTeamsSyncClient,
  resolveActiveTeamStore,
} from "@/lib/team/active-store";
import { isCloudTeamStore } from "@/lib/team/cloud-team-store";
import { localTeamStore } from "@/lib/team/team-store";

function createFakeClient() {
  const client = {
    from() {
      return {
        select() {
          return { eq: () => Promise.resolve({ data: [], error: null }) };
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

afterEach(() => {
  setTeamsSyncClient(null);
});

describe("resolveActiveTeamStore", () => {
  it("uses the local store for guests", () => {
    setTeamsSyncClient(createFakeClient());

    const store = resolveActiveTeamStore({ isConfigured: true, user: null });

    expect(store).toBe(localTeamStore);
    expect(isCloudTeamStore(store)).toBe(false);
  });

  it("uses the local store when auth is not configured", () => {
    setTeamsSyncClient(createFakeClient());

    const store = resolveActiveTeamStore({
      isConfigured: false,
      user: { id: "user-1" },
    });

    expect(store).toBe(localTeamStore);
  });

  it("uses the local store when no sync client is available", () => {
    setTeamsSyncClient(null);

    const store = resolveActiveTeamStore({
      isConfigured: true,
      user: { id: "user-1" },
    });

    expect(store).toBe(localTeamStore);
  });

  it("uses the cloud store for signed-in users with a client", () => {
    setTeamsSyncClient(createFakeClient());

    const store = resolveActiveTeamStore({
      isConfigured: true,
      user: { id: "user-1" },
    });

    expect(isCloudTeamStore(store)).toBe(true);
  });

  it("picks up a new client after setTeamsSyncClient", () => {
    setTeamsSyncClient(null);
    const store = resolveActiveTeamStore({
      isConfigured: true,
      user: { id: "user-1" },
    });
    expect(store).toBe(localTeamStore);

    setTeamsSyncClient(createFakeClient());
    const cloud = resolveActiveTeamStore({
      isConfigured: true,
      user: { id: "user-1" },
    });
    expect(isCloudTeamStore(cloud)).toBe(true);
  });
});
