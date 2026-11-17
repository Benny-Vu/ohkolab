import { describe, expect, it } from "vitest";

import type { PokemonSet } from "@/types/pokemon";
import { emptyStatsTable } from "@/types/pokemon";
import type { Team } from "@/types/team";

import {
  parseTeamAttachment,
  teamAttachment,
  teamAttachmentJson,
} from "@/features/feed/attachment";

const set: PokemonSet = {
  species: "Garchomp",
  item: "Choice Scarf",
  ability: "Rough Skin",
  nature: "Jolly",
  statPoints: emptyStatsTable(4),
  moves: ["Earthquake", "Protect", null, null],
  gender: "M",
};

const team: Team = {
  id: "team-1",
  name: "Sand",
  format: "doubles",
  members: [set],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("teamAttachment", () => {
  it("snapshots the team fields the feed needs", () => {
    expect(teamAttachment(team)).toEqual({
      kind: "team",
      name: "Sand",
      format: "doubles",
      members: [set],
    });
  });
});

describe("teamAttachmentJson", () => {
  it("produces JSON that parses back to the same attachment", () => {
    const attachment = teamAttachment(team);
    expect(parseTeamAttachment(teamAttachmentJson(attachment))).toEqual(
      attachment,
    );
  });
});

describe("parseTeamAttachment", () => {
  it("round-trips a team attachment through JSON", () => {
    const attachment = teamAttachment(team);
    const json = JSON.parse(JSON.stringify(attachment));
    expect(parseTeamAttachment(json)).toEqual(attachment);
  });

  it("returns null for null and non-object values", () => {
    expect(parseTeamAttachment(null)).toBeNull();
    expect(parseTeamAttachment("team")).toBeNull();
    expect(parseTeamAttachment(3)).toBeNull();
  });

  it("returns null when the kind is not team", () => {
    expect(parseTeamAttachment({ kind: "calc" })).toBeNull();
  });

  it("returns null when the name or format is invalid", () => {
    const json = teamAttachmentJson(teamAttachment(team));
    expect(parseTeamAttachment({ ...json, name: 5 })).toBeNull();
    expect(parseTeamAttachment({ ...json, format: "triples" })).toBeNull();
  });

  it("returns null when members is not an array", () => {
    const attachment = teamAttachment(team);
    expect(parseTeamAttachment({ ...attachment, members: "nope" })).toBeNull();
  });

  it("returns null when a member is not a valid set", () => {
    const attachment = teamAttachment(team);
    expect(
      parseTeamAttachment({ ...attachment, members: [{ species: "" }] }),
    ).toBeNull();
    expect(
      parseTeamAttachment({
        ...attachment,
        members: [{ item: "Choice Scarf" }],
      }),
    ).toBeNull();
    expect(
      parseTeamAttachment({
        ...attachment,
        members: [{ ...set, statPoints: { hp: "many" } }],
      }),
    ).toBeNull();
    expect(
      parseTeamAttachment({
        ...attachment,
        members: [{ ...set, moves: ["Earthquake"] }],
      }),
    ).toBeNull();
  });

  it("accepts sets with optional fields missing", () => {
    const minimal = {
      kind: "team",
      name: "Bare",
      format: "singles",
      members: [
        {
          species: "Pikachu",
          item: null,
          ability: null,
          nature: "Timid",
          statPoints: emptyStatsTable(),
          moves: [null, null, null, null],
        },
      ],
    };
    expect(parseTeamAttachment(minimal)).toEqual({
      kind: "team",
      name: "Bare",
      format: "singles",
      members: [
        {
          species: "Pikachu",
          item: null,
          ability: null,
          nature: "Timid",
          statPoints: emptyStatsTable(),
          moves: [null, null, null, null],
        },
      ],
    });
  });
});
