import type { NameKind } from "@/data/display-names";
import type { TranslationKey } from "@/lib/i18n/en";
import type { SideFlag } from "@/lib/calc/state";
import type { Terrain, Weather } from "@/types/battle";

/** The display-name function `useDisplayName` returns. */
export type DisplayName = (kind: NameKind, id: string) => string;

export const WEATHER_LABEL_KEYS: Record<Weather, TranslationKey> = {
  Sun: "calc.weatherSun",
  Rain: "calc.weatherRain",
  Sand: "calc.weatherSand",
  Snow: "calc.weatherSnow",
};

export const TERRAIN_LABEL_KEYS: Record<Terrain, TranslationKey> = {
  Electric: "calc.terrainElectric",
  Grassy: "calc.terrainGrassy",
  Psychic: "calc.terrainPsychic",
  Misty: "calc.terrainMisty",
};

/**
 * The screens, support and hazards every side can carry. Each label is a
 * roster name: a move for the screens and hazards, an ability for
 * Friend Guard, so the flags render through `displayName`.
 */
export const SIDE_FLAGS: { flag: SideFlag; label: string; kind: NameKind }[] = [
  { flag: "reflect", label: "Reflect", kind: "move" },
  { flag: "lightScreen", label: "Light Screen", kind: "move" },
  { flag: "auroraVeil", label: "Aurora Veil", kind: "move" },
  { flag: "tailwind", label: "Tailwind", kind: "move" },
  { flag: "stealthRock", label: "Stealth Rock", kind: "move" },
];

/** Doubles-only conditions; they do nothing in singles. */
export const DOUBLES_FLAGS: {
  flag: SideFlag;
  label: string;
  kind: NameKind;
}[] = [
  { flag: "helpingHand", label: "Helping Hand", kind: "move" },
  { flag: "friendGuard", label: "Friend Guard", kind: "ability" },
];

export const ALL_SIDE_FLAGS = [...SIDE_FLAGS, ...DOUBLES_FLAGS];
