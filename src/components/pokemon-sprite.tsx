import { useState } from "react";

import { useDisplayName } from "@/data/display-names";
import {
  getItemIcon,
  getPokemonIcon,
  getSprite,
  type IconInfo,
} from "@/data/sprites";
import { cn } from "@/lib/utils";

interface SpriteProps {
  species: string;
  /** Rendered size in pixels (the sprite is square). Default 96. */
  size?: number;
  className?: string;
}

/**
 * Neutral placeholder with the localized name, shown when a remote sprite
 * or icon cannot load (offline, blocked, 404): no broken-image glyph, and
 * the exact box the image would have occupied, so nothing shifts.
 */
function NamePlaceholder({
  name,
  width,
  height,
  className,
  textClassName,
}: {
  name: string;
  width: number;
  height: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xs bg-muted px-1 text-center",
        className,
      )}
      style={{ width, height }}
    >
      <span
        className={cn(
          "line-clamp-3 leading-tight text-muted-foreground",
          textClassName,
        )}
      >
        {name}
      </span>
    </span>
  );
}

/** Battle sprite of a species or forme. */
export function PokemonSprite({ species, size = 96, className }: SpriteProps) {
  const sprite = getSprite(species);
  const nameFor = useDisplayName();
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <NamePlaceholder
        name={nameFor("species", species)}
        width={size}
        height={size}
        className={className}
        textClassName="text-xs"
      />
    );
  }

  return (
    <img
      src={sprite.url}
      alt={nameFor("species", species)}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
      style={{ imageRendering: sprite.pixelated ? "pixelated" : undefined }}
    />
  );
}

function SheetIcon({
  icon,
  name,
  className,
}: {
  icon: IconInfo;
  /** The localized display name: the accessible label and placeholder text. */
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <NamePlaceholder
        name={name}
        width={icon.width}
        height={icon.height}
        className={className}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "relative inline-block shrink-0 overflow-hidden",
        className,
      )}
      style={{ width: icon.width, height: icon.height }}
    >
      {/* A real <img> (cropped by the wrapper) instead of a CSS background,
          so load failures surface as onError and can swap in the
          placeholder. The sheet image itself stays decorative. */}
      <img
        src={icon.url}
        alt=""
        aria-hidden
        draggable={false}
        loading="lazy"
        onError={() => setFailed(true)}
        // max-w-none: Tailwind's base `img { max-width: 100% }` would
        // otherwise shrink the whole sheet into the small window.
        className="pointer-events-none absolute max-w-none select-none"
        style={{
          left: icon.left,
          top: icon.top,
          imageRendering: "pixelated",
        }}
      />
    </span>
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
  const nameFor = useDisplayName();
  return (
    <SheetIcon
      icon={getPokemonIcon(species)}
      name={nameFor("species", species)}
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
  const nameFor = useDisplayName();
  return (
    <SheetIcon
      icon={getItemIcon(item)}
      name={nameFor("item", item)}
      className={className}
    />
  );
}
