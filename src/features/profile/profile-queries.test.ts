import { describe, expect, it } from "vitest";

import { createDefaultSet } from "@/data";
import { mapProfileRow } from "@/features/profile/profile-queries";
import type { ProfileRow, TeamRow } from "@/lib/database.types";
import { rowToTeam } from "@/lib/team";

const profileRow: ProfileRow = {
  id: "user-1",
  username: "ashketchum",
  display_name: "Ash",
  avatar_species: "Pikachu",
  bio: "Pallet Town",
  favourite_species: "Garchomp",
  main_format: "doubles",
  looking_for: "practice partners",
  youtube_url: "https://youtube.com/@ash",
  twitch_url: null,
  showdown_name: "ashketchum",
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
    game_team_id: null,
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
      favouriteSpecies: "Garchomp",
      mainFormat: "doubles",
      lookingFor: "practice partners",
      youtubeUrl: "https://youtube.com/@ash",
      twitchUrl: null,
      showdownName: "ashketchum",
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
      favourite_species: null,
      main_format: null,
      looking_for: null,
      youtube_url: null,
      twitch_url: null,
      showdown_name: null,
    };
    const profile = mapProfileRow(row);
    expect(profile.displayName).toBeNull();
    expect(profile.avatarSpecies).toBeNull();
    expect(profile.bio).toBeNull();
    expect(profile.favouriteSpecies).toBeNull();
    expect(profile.mainFormat).toBeNull();
    expect(profile.lookingFor).toBeNull();
    expect(profile.youtubeUrl).toBeNull();
    expect(profile.twitchUrl).toBeNull();
    expect(profile.showdownName).toBeNull();
  });
});

describe("rowToTeam (via @/lib/team)", () => {
  it("maps a database row to a team", () => {
    expect(rowToTeam(teamRow())).toEqual({
      id: "team-1",
      name: "Champion team",
      format: "doubles",
      members: [createDefaultSet("Garchomp"), createDefaultSet("Incineroar")],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      isPublic: true,
    });
  });

  it("drops members without a species", () => {
    const team = rowToTeam(
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
    const team = rowToTeam(
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
    const team = rowToTeam(
      teamRow({ format: "triples" as unknown as TeamRow["format"] }),
    );
    expect(team?.format).toBe("doubles");
  });

  it("returns null when the row has no id", () => {
    expect(rowToTeam(teamRow({ id: "" }))).toBeNull();
  });
});
