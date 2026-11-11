/**
 * The app's only doorway to Pokémon data. Everything outside `src/data/`
 * imports from `@/data` and never from `@pkmn/*` or `@smogon/calc`.
 */
export { getAbility, listAbilities, type AbilityInfo } from "@/data/abilities";
export { calculateDamage } from "@/data/damage";
export { getItem, listItems, listItemsFor, type ItemInfo } from "@/data/items";
export {
  getLearnableMoves,
  getMove,
  listMoves,
  type MoveInfo,
} from "@/data/moves";
export {
  DEFAULT_NATURE,
  getNature,
  listNatures,
  type NatureInfo,
} from "@/data/natures";
export { createDefaultSet, validateSet } from "@/data/sets";
export {
  getSpecies,
  listSpecies,
  resolveBattleForme,
  type ListSpeciesOptions,
  type MegaOption,
  type SpeciesInfo,
} from "@/data/species";
export {
  getItemIcon,
  getPokemonIcon,
  getSprite,
  type IconInfo,
  type SpriteInfo,
} from "@/data/sprites";
export {
  calcStat,
  calcStats,
  LEVEL,
  MAX_SP_PER_STAT,
  MAX_SP_TOTAL,
  totalStatPoints,
} from "@/data/stats";
export { defensiveMatchups, typeEffectiveness } from "@/data/type-chart";
