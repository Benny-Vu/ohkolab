import type { TypeName } from "@/types/pokemon";

/** Background colour per Pokémon type. Tuned so white text passes 4.5:1. */
export const TYPE_COLORS: Record<TypeName, string> = {
  Normal: "#777758",
  Fire: "#c35300",
  Water: "#3e72d4",
  Electric: "#937000",
  Grass: "#3b851d",
  Ice: "#21827f",
  Fighting: "#b0302a",
  Poison: "#93399a",
  Ground: "#936f12",
  Flying: "#7663c9",
  Psychic: "#d3386a",
  Bug: "#6d7c00",
  Rock: "#88741d",
  Ghost: "#644d8c",
  Dragon: "#5a2fe0",
  Dark: "#5e4a3d",
  Steel: "#727197",
  Fairy: "#ba5083",
};
