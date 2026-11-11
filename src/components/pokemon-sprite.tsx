import { getItemIcon, getPokemonIcon, getSprite, type IconInfo } from "@/data";
import { cn } from "@/lib/utils";

interface SpriteProps {
  species: string;
  /** Rendered size in pixels (the sprite is square). Default 96. */
  size?: number;
  className?: string;
}

/** Battle sprite of a species or forme. */
export function PokemonSprite({ species, size = 96, className }: SpriteProps) {
  const sprite = getSprite(species);
  return (
    <img
      src={sprite.url}
      alt={species}
      width={size}
      height={size}
      loading="lazy"
      className={cn("object-contain", className)}
      style={{ imageRendering: sprite.pixelated ? "pixelated" : undefined }}
    />
  );
}

function SheetIcon({
  icon,
  label,
  className,
}: {
  icon: IconInfo;
  label: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-block shrink-0", className)}
      style={{
        width: icon.width,
        height: icon.height,
        imageRendering: "pixelated",
        background: `transparent url(${icon.url}) no-repeat scroll ${icon.left}px ${icon.top}px`,
      }}
    />
  );
}

/** Small 40x30 box icon of a species, for lists and team rows. */
export function PokemonIcon({
  species,
  className,
}: {
  species: string;
  className?: string;
}) {
  return (
    <SheetIcon
      icon={getPokemonIcon(species)}
      label={species}
      className={className}
    />
  );
}

/** Small 24x24 icon of a held item. */
export function ItemIcon({
  item,
  className,
}: {
  item: string;
  className?: string;
}) {
  return (
    <SheetIcon icon={getItemIcon(item)} label={item} className={className} />
  );
}
