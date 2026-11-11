import { Icons, Sprites } from "@pkmn/img";

export interface SpriteInfo {
  url: string;
  width: number;
  height: number;
  pixelated: boolean;
}

export interface IconInfo {
  /** Sprite sheet URL. */
  url: string;
  width: number;
  height: number;
  /** Offsets into the sheet, in pixels (negative numbers). */
  left: number;
  top: number;
}

/** Static battle sprite for a species or forme. */
export function getSprite(species: string): SpriteInfo {
  const sprite = Sprites.getPokemon(species, { gen: "gen5" });
  return {
    url: sprite.url,
    width: sprite.w,
    height: sprite.h,
    pixelated: sprite.pixelated ?? true,
  };
}

/** Small box icon for a species, as a position in a sprite sheet. */
export function getPokemonIcon(species: string): IconInfo {
  const icon = Icons.getPokemon(species);
  return {
    url: icon.url,
    width: 40,
    height: 30,
    left: icon.left,
    top: icon.top,
  };
}

/** Small icon for a held item, as a position in a sprite sheet. */
export function getItemIcon(item: string): IconInfo {
  const icon = Icons.getItem(item);
  return {
    url: icon.url,
    width: 24,
    height: 24,
    left: icon.left,
    top: icon.top,
  };
}
