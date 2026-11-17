import { cn } from "@/lib/utils";

import { PokemonSprite } from "@/components/pokemon-sprite";

export type UserAvatarSize = "sm" | "md" | "lg";

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

/**
 * One default avatar everywhere: the user's Pokémon when set, otherwise their
 * initial on a tinted circle. Never Missingno, never an empty box.
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
      <PokemonSprite
        species={avatarSpecies}
        size={SPRITE_SIZES[size]}
        className={cn(sizeClass, "shrink-0", className)}
      />
    );
  }

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
