import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The store caches its snapshot at module level (so `useSyncExternalStore`
 * hands out a stable identity), so every test imports a fresh copy after
 * clearing local storage — the same pattern as the locale store's tests.
 */
async function freshStore() {
  vi.resetModules();
  return import("@/features/battle/recent-species");
}

describe("recent species store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty and remembers picks newest first", async () => {
    const { listRecentSpecies, rememberSpecies } = await freshStore();
    expect(listRecentSpecies()).toEqual([]);
    rememberSpecies("Garchomp");
    rememberSpecies("Incineroar");
    expect(listRecentSpecies()).toEqual(["Incineroar", "Garchomp"]);
  });

  it("moves a repeated pick to the front without duplicating it", async () => {
    const { listRecentSpecies, rememberSpecies } = await freshStore();
    rememberSpecies("Garchomp");
    rememberSpecies("Incineroar");
    rememberSpecies("Garchomp");
    expect(listRecentSpecies()).toEqual(["Garchomp", "Incineroar"]);
  });

  it("keeps at most six picks", async () => {
    const { listRecentSpecies, rememberSpecies } = await freshStore();
    for (const name of ["A", "B", "C", "D", "E", "F", "G", "H"] as const) {
      rememberSpecies(name);
    }
    expect(listRecentSpecies()).toEqual(["H", "G", "F", "E", "D", "C"]);
  });

  it("persists to local storage and reads a fresh page back", async () => {
    {
      const { rememberSpecies } = await freshStore();
      rememberSpecies("Garchomp");
    }
    const { listRecentSpecies } = await freshStore();
    expect(listRecentSpecies()).toEqual(["Garchomp"]);
    expect(
      JSON.parse(localStorage.getItem("ohkolab:battle:recent-species") ?? "[]"),
    ).toEqual(["Garchomp"]);
  });

  it("ignores corrupted storage", async () => {
    localStorage.setItem("ohkolab:battle:recent-species", "{not json");
    const { listRecentSpecies } = await freshStore();
    expect(listRecentSpecies()).toEqual([]);
  });

  it("drops a species with forgetSpecies", async () => {
    const { listRecentSpecies, rememberSpecies, forgetSpecies } =
      await freshStore();
    rememberSpecies("Garchomp");
    rememberSpecies("Incineroar");
    forgetSpecies("Garchomp");
    expect(listRecentSpecies()).toEqual(["Incineroar"]);
  });
});
