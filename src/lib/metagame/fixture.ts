import type { BattleFormat } from "@/types/battle";
import type { MetagameIndex, MetagameSnapshot } from "@/lib/metagame/types";

function statPoints(
  hp: number,
  atk: number,
  def: number,
  spa: number,
  spd: number,
  spe: number,
) {
  return { hp, atk, def, spa, spd, spe };
}

/** Hand-written doubles snapshot matching the stream-3 contract. */
export const snapshotFixture: MetagameSnapshot = {
  format: "doubles",
  regulation: "M-C",
  period: "2026-10",
  battles: 1649648,
  generatedAt: "2026-11-05T12:00:00.000Z",
  source: {
    id: "showdown-ladder",
    label: "Pokémon Showdown ladder",
    url: "https://www.smogon.com/stats/2026-10/chaos/gen9championsvgc2026regmc-1630.json",
    formatId: "gen9championsvgc2026regmc",
    ratingCutoff: 1630,
  },
  pokemon: [
    {
      species: "Sneasler",
      rank: 1,
      usage: 0.412,
      abilities: [
        { name: "Poison Touch", share: 0.71 },
        { name: "Unburden", share: 0.29 },
      ],
      items: [
        { name: "Focus Sash", share: 0.42 },
        { name: "Life Orb", share: 0.18 },
      ],
      moves: [
        { name: "Close Combat", share: 0.88 },
        { name: "Dire Claw", share: 0.76 },
        { name: "U-turn", share: 0.41 },
        { name: "Protect", share: 0.33 },
        { name: "Swords Dance", share: 0.22 },
      ],
      natures: [
        { name: "Jolly", share: 0.62 },
        { name: "Hasty", share: 0.21 },
      ],
      spreads: [
        {
          nature: "Jolly",
          statPoints: statPoints(0, 24, 0, 0, 0, 32),
          share: 0.58,
        },
        {
          nature: "Hasty",
          statPoints: statPoints(0, 20, 0, 0, 0, 32),
          share: 0.21,
        },
      ],
      teammates: [
        { name: "Rillaboom", share: 0.63 },
        { name: "Incineroar", share: 0.55 },
      ],
    },
    {
      species: "Rillaboom",
      rank: 2,
      usage: 0.384,
      abilities: [{ name: "Grassy Surge", share: 0.97 }],
      items: [
        { name: "Focus Sash", share: 0.31 },
        { name: "Choice Scarf", share: 0.24 },
      ],
      moves: [
        { name: "Fake Out", share: 0.82 },
        { name: "U-turn", share: 0.64 },
        { name: "Protect", share: 0.52 },
        { name: "Knock Off", share: 0.38 },
      ],
      natures: [
        { name: "Adamant", share: 0.44 },
        { name: "Jolly", share: 0.31 },
      ],
      spreads: [
        {
          nature: "Adamant",
          statPoints: statPoints(4, 26, 0, 0, 0, 32),
          share: 0.44,
        },
        {
          nature: "Jolly",
          statPoints: statPoints(0, 20, 0, 0, 0, 32),
          share: 0.31,
        },
      ],
      teammates: [
        { name: "Sneasler", share: 0.61 },
        { name: "Incineroar", share: 0.48 },
      ],
    },
    {
      species: "Incineroar",
      rank: 3,
      usage: 0.351,
      abilities: [{ name: "Intimidate", share: 0.96 }],
      items: [
        { name: "Sitrus Berry", share: 0.36 },
        { name: "Leftovers", share: 0.21 },
      ],
      moves: [
        { name: "Fake Out", share: 0.91 },
        { name: "Knock Off", share: 0.66 },
        { name: "Parting Shot", share: 0.58 },
        { name: "Flare Blitz", share: 0.44 },
        { name: "Will-O-Wisp", share: 0.27 },
      ],
      natures: [
        { name: "Careful", share: 0.47 },
        { name: "Adamant", share: 0.22 },
      ],
      spreads: [
        {
          nature: "Careful",
          statPoints: statPoints(24, 0, 8, 0, 26, 0),
          share: 0.47,
        },
        {
          nature: "Adamant",
          statPoints: statPoints(16, 20, 0, 0, 0, 24),
          share: 0.22,
        },
      ],
      teammates: [
        { name: "Rillaboom", share: 0.52 },
        { name: "Sneasler", share: 0.49 },
      ],
    },
    {
      species: "Kingambit",
      rank: 4,
      usage: 0.298,
      abilities: [{ name: "Supreme Overlord", share: 0.93 }],
      items: [
        { name: "Leftovers", share: 0.33 },
        { name: "Focus Sash", share: 0.19 },
      ],
      moves: [
        { name: "Swords Dance", share: 0.54 },
        { name: "Knock Off", share: 0.72 },
        { name: "Close Combat", share: 0.35 },
        { name: "Protect", share: 0.29 },
      ],
      natures: [
        { name: "Adamant", share: 0.51 },
        { name: "Brave", share: 0.27 },
      ],
      spreads: [
        {
          nature: "Adamant",
          statPoints: statPoints(12, 28, 0, 0, 0, 20),
          share: 0.51,
        },
        {
          nature: "Brave",
          statPoints: statPoints(16, 30, 0, 0, 0, 0),
          share: 0.27,
        },
      ],
      teammates: [
        { name: "Incineroar", share: 0.44 },
        { name: "Rillaboom", share: 0.41 },
      ],
    },
    {
      species: "Charizard-Mega-Y",
      rank: 5,
      usage: 0.243,
      abilities: [{ name: "Drought", share: 1 }],
      items: [{ name: "Charizardite Y", share: 1 }],
      moves: [
        { name: "Heat Wave", share: 0.86 },
        { name: "Overheat", share: 0.47 },
        { name: "Protect", share: 0.42 },
        { name: "Fire Blast", share: 0.31 },
      ],
      natures: [
        { name: "Timid", share: 0.66 },
        { name: "Modest", share: 0.24 },
      ],
      spreads: [
        {
          nature: "Timid",
          statPoints: statPoints(0, 0, 0, 28, 0, 32),
          share: 0.66,
        },
        {
          nature: "Modest",
          statPoints: statPoints(0, 0, 4, 30, 0, 28),
          share: 0.24,
        },
      ],
      teammates: [
        { name: "Sneasler", share: 0.38 },
        { name: "Rillaboom", share: 0.35 },
      ],
    },
    {
      species: "Archaludon",
      rank: 6,
      usage: 0.227,
      abilities: [{ name: "Stamina", share: 0.94 }],
      items: [
        { name: "Assault Vest", share: 0.4 },
        { name: "Focus Sash", share: 0.15 },
      ],
      moves: [
        { name: "Draco Meteor", share: 0.79 },
        { name: "Snarl", share: 0.51 },
        { name: "Protect", share: 0.46 },
        { name: "Flash Cannon", share: 0.33 },
      ],
      natures: [
        { name: "Modest", share: 0.58 },
        { name: "Timid", share: 0.19 },
      ],
      spreads: [
        {
          nature: "Modest",
          statPoints: statPoints(0, 0, 4, 30, 0, 28),
          share: 0.58,
        },
        {
          nature: "Timid",
          statPoints: statPoints(0, 0, 0, 26, 0, 32),
          share: 0.19,
        },
      ],
      teammates: [
        { name: "Charizard-Mega-Y", share: 0.33 },
        { name: "Sneasler", share: 0.3 },
      ],
    },
  ],
};

/** Hand-written index matching the stream-3 contract. */
export const indexFixture: MetagameIndex = {
  latest: {
    doubles: "data/metagame/2026-10/doubles.json",
    singles: "data/metagame/2026-09/singles.json",
  },
  snapshots: [
    {
      format: "doubles",
      period: "2026-10",
      regulation: "M-C",
      path: "data/metagame/2026-10/doubles.json",
    },
    {
      format: "doubles",
      period: "2026-09",
      regulation: "M-C",
      path: "data/metagame/2026-09/doubles.json",
    },
    {
      format: "singles",
      period: "2026-09",
      regulation: "M-C",
      path: "data/metagame/2026-09/singles.json",
    },
  ],
};

/** A minimal valid snapshot for singles-month tests. */
export function singlesSnapshotFixture(format: BattleFormat): MetagameSnapshot {
  return {
    ...snapshotFixture,
    format,
    period: "2026-09",
    battles: 87848,
    source: {
      ...snapshotFixture.source,
      formatId: "gen9championsbssregmc",
      url: "https://www.smogon.com/stats/2026-09/chaos/gen9championsbssregmc-1630.json",
    },
    pokemon: snapshotFixture.pokemon.slice(0, 3),
  };
}
