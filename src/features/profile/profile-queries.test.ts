import { describe, expect, it } from "vitest";

import { createDefaultSet } from "@/data";
import { mapProfileRow, mapTeamRow } from "@/features/profile/profile-queries";
import type { ProfileRow, TeamRow } from "@/lib/database.types";

const profileRow: ProfileRow = {
  id: "user-1",
  username: "ashketchum",
  display_name: "Ash",
  avatar_species: "Pikachu",
  bio: "Pallet Town",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-02-01T00:00:00Z",
};

function teamRow(overrides: Partial<TeamRow> = {}): TeamRow {
  return {
    id: "team-1",
    user_id: "user-1",
    name: "Champion team",
    data: [createDefaultSet("Garchomp"), createDefaultSet("Incineroar")],
    format: "doubles",
    is_public: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    ...overrides,
  };
}

describe("mapProfileRow", () => {
  it("maps database column names to the profile shape", () => {
    expect(mapProfileRow(profileRow)).toEqual({
      id: "user-1",
      username: "ashketchum",
      displayName: "Ash",
      avatarSpecies: "Pikachu",
      bio: "Pallet Town",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-02-01T00:00:00Z",
    });
  });

  it("keeps optional profile fields null", () => {
    const row: ProfileRow = {
      ...profileRow,
      display_name: null,
      avatar_species: null,
      bio: null,
    };
    const profile = mapProfileRow(row);
    expect(profile.displayName).toBeNull();
    expect(profile.avatarSpecies).toBeNull();
    expect(profile.bio).toBeNull();
  });
});

describe("mapTeamRow", () => {
  it("maps a database row to a team", () => {
    expect(mapTeamRow(teamRow())).toEqual({
      id: "team-1",
      name: "Champion team",
      format: "doubles",
      members: [createDefaultSet("Garchomp"), createDefaultSet("Incineroar")],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
    });
  });

  it("drops members without a species", () => {
    const team = mapTeamRow(
      teamRow({
        data: [
          createDefaultSet("Garchomp"),
          { ...createDefaultSet("Pikachu"), species: "" },
        ],
      }),
    );
    expect(team?.members.map((member) => member.species)).toEqual(["Garchomp"]);
  });

  it("caps members at the team size limit", () => {
    const team = mapTeamRow(
      teamRow({
        data: [
          createDefaultSet("Garchomp"),
          createDefaultSet("Incineroar"),
          createDefaultSet("Pikachu"),
          createDefaultSet("Charizard"),
          createDefaultSet("Dragonite"),
          createDefaultSet("Gengar"),
          createDefaultSet("Kingambit"),
        ],
      }),
    );
    expect(team?.members).toHaveLength(6);
    expect(team?.members[5]?.species).toBe("Gengar");
  });

  it("falls back to doubles for an unknown format", () => {
    const team = mapTeamRow(
      teamRow({ format: "triples" as unknown as TeamRow["format"] }),
    );
    expect(team?.format).toBe("doubles");
  });

  it("returns null when the row has no id", () => {
    expect(mapTeamRow(teamRow({ id: "" }))).toBeNull();
  });
});
