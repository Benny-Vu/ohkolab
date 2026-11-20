import { lazy, Suspense } from "react";

import { cn } from "@/lib/utils";

// The sprite component statically imports the display-name lookup, whose
// data lives in the 2.3 MB Pokémon data chunk. Loading it lazily keeps that
// chunk (and the sprite helpers) off the startup path: visitors who never see
// an avatar never download it, and avatar users see the initials circle
// until the chunk arrives instead of waiting for it before the first paint.
const PokemonSprite = lazy(() =>
  import("@/components/pokemon-sprite").then((m) => ({
    default: m.PokemonSprite,
  })),
);

type UserAvatarSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<UserAvatarSize, string> = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-16 text-xl",
};

const SPRITE_SIZES: Record<UserAvatarSize, number> = {
  sm: 24,
  md: 32,
  lg: 56,
};

/**
 * Full class strings so the Tailwind scanner sees them; chart-1 is skipped
 * because it reads as the danger red.
 */
const TINT_CLASSES = [
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
  "bg-chart-5/15 text-chart-5",
] as const;

function tintClassFor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i += 1) {
    hash = (hash * 31 + username.charCodeAt(i)) % 997;
  }
  return TINT_CLASSES[hash % TINT_CLASSES.length]!;
}

function initialsFor(username: string, displayName: string | null): string {
  const source = displayName?.trim() || username.trim();
  if (source.length === 0) return "?";
  return source[0]!.toUpperCase();
}

interface UserAvatarProps {
  username: string;
  displayName?: string | null;
  avatarSpecies?: string | null;
  size?: UserAvatarSize;
  className?: string;
}

function InitialsCircle({
  username,
  displayName,
  sizeClass,
  className,
}: {
  username: string;
  displayName: string | null;
  sizeClass: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-content-center overflow-hidden rounded-full font-semibold",
        sizeClass,
        tintClassFor(username),
        className,
      )}
    >
      {initialsFor(username, displayName)}
    </span>
  );
}

/**
 * One default avatar everywhere: the user's Pokémon when set, otherwise their
 * initial on a tinted circle. Never Missingno, never an empty box. While the
 * sprite's chunk is still loading the initial shows in its place.
 */
export function UserAvatar({
  username,
  displayName = null,
  avatarSpecies = null,
  size = "md",
  className,
}: UserAvatarProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (avatarSpecies) {
    return (
      <Suspense
        fallback={
          <InitialsCircle
            username={username}
            displayName={displayName}
            sizeClass={sizeClass}
            className={className}
          />
        }
      >
        <PokemonSprite
          species={avatarSpecies}
          size={SPRITE_SIZES[size]}
          className={cn(sizeClass, "shrink-0", className)}
        />
      </Suspense>
    );
  }

  return (
    <InitialsCircle
      username={username}
      displayName={displayName}
      sizeClass={sizeClass}
      className={className}
    />
  );
}
