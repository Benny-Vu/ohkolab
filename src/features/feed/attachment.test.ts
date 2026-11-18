import { describe, expect, it } from "vitest";

import type { DamageResult } from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";
import { emptyStatsTable } from "@/types/pokemon";
import type { Team } from "@/types/team";

import {
  calcResultAttachment,
  calcResultAttachmentJson,
  parseCalcResultAttachment,
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

const damage: DamageResult = {
  move: "Earthquake",
  min: 102,
  max: 120,
  minPercent: 48.6,
  maxPercent: 57.1,
  defenderMaxHp: 210,
  rolls: [102, 105, 108, 112, 115, 120],
  description: "252 SpA Garchomp Earthquake vs. 0 HP / 0 SpD Onix",
  koText: "guaranteed 2HKO",
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

describe("calcResultAttachment", () => {
  it("snapshots the calc result fields the feed needs", () => {
    expect(calcResultAttachment("Garchomp", "Onix", damage)).toEqual({
      kind: "calc-result",
      attacker: "Garchomp",
      defender: "Onix",
      move: "Earthquake",
      min: 102,
      max: 120,
      minPercent: 48.6,
      maxPercent: 57.1,
      defenderMaxHp: 210,
      rolls: [102, 105, 108, 112, 115, 120],
      description: damage.description,
      koText: damage.koText,
    });
  });

  it("keeps a null rolls list null", () => {
    const attachment = calcResultAttachment("Garchomp", "Onix", {
      ...damage,
      rolls: null,
    });
    expect(attachment.rolls).toBeNull();
  });
});

describe("calcResultAttachmentJson", () => {
  it("produces JSON that parses back to the same attachment", () => {
    const attachment = calcResultAttachment("Garchomp", "Onix", damage);
    expect(
      parseCalcResultAttachment(calcResultAttachmentJson(attachment)),
    ).toEqual(attachment);
  });
});

describe("parseCalcResultAttachment", () => {
  it("round-trips a calc result through JSON", () => {
    const attachment = calcResultAttachment("Garchomp", "Onix", damage);
    const json = JSON.parse(JSON.stringify(attachment));
    expect(parseCalcResultAttachment(json)).toEqual(attachment);
  });

  it("returns null for null and non-object values", () => {
    expect(parseCalcResultAttachment(null)).toBeNull();
    expect(parseCalcResultAttachment("calc-result")).toBeNull();
    expect(parseCalcResultAttachment(3)).toBeNull();
    expect(parseCalcResultAttachment([1, 2])).toBeNull();
  });

  it("returns null when the kind is not calc-result", () => {
    expect(parseCalcResultAttachment({ kind: "team" })).toBeNull();
  });

  it("returns null when a field has the wrong type", () => {
    const json = calcResultAttachmentJson(
      calcResultAttachment("Garchomp", "Onix", damage),
    );
    expect(parseCalcResultAttachment({ ...json, attacker: 5 })).toBeNull();
    expect(parseCalcResultAttachment({ ...json, defender: null })).toBeNull();
    expect(parseCalcResultAttachment({ ...json, move: true })).toBeNull();
    expect(parseCalcResultAttachment({ ...json, min: "102" })).toBeNull();
    expect(parseCalcResultAttachment({ ...json, max: null })).toBeNull();
    expect(
      parseCalcResultAttachment({ ...json, minPercent: "48.6" }),
    ).toBeNull();
    expect(parseCalcResultAttachment({ ...json, maxPercent: [] })).toBeNull();
    expect(
      parseCalcResultAttachment({ ...json, defenderMaxHp: "210" }),
    ).toBeNull();
    expect(parseCalcResultAttachment({ ...json, description: 7 })).toBeNull();
    expect(parseCalcResultAttachment({ ...json, koText: false })).toBeNull();
  });

  it("returns null when rolls is neither null nor a number array", () => {
    const json = calcResultAttachmentJson(
      calcResultAttachment("Garchomp", "Onix", damage),
    );
    expect(parseCalcResultAttachment({ ...json, rolls: "102-120" })).toBeNull();
    expect(
      parseCalcResultAttachment({ ...json, rolls: [102, "105"] }),
    ).toBeNull();
    expect(parseCalcResultAttachment({ ...json, rolls: [null] })).toBeNull();
  });

  it("accepts a payload with null rolls", () => {
    const attachment = calcResultAttachment("Garchomp", "Onix", {
      ...damage,
      rolls: null,
    });
    const json = JSON.parse(JSON.stringify(attachment));
    expect(parseCalcResultAttachment(json)).toEqual(attachment);
  });
});
