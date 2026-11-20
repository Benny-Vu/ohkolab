import { ItemIcon, PokemonSprite } from "@/components/pokemon-sprite";
import { ROW_ENTRANCE, staggerDelay } from "@/lib/motion/entrance";
import { useT } from "@/lib/i18n/t";
import { useDisplayName } from "@/data";
import { cn } from "@/lib/utils";
import type { PokemonSet } from "@/types/pokemon";
import { MAX_TEAM_SIZE } from "@/types/team";

/** The team shape the preview needs: just the members, in team order. */
interface TeamPreviewTeam {
  members: PokemonSet[];
}

interface TeamPreviewProps {
  team: TeamPreviewTeam;
  /** `compact`: one row of six sprites with item icons. `expanded`: a grid of detail slots. */
  variant?: "compact" | "expanded";
  /** Accessible name for the list. Defaults to the localized "Team preview". */
  ariaLabel?: string;
  className?: string;
}

/** The slot's localized title: the nickname when it has one, else the species. */
function useMemberTitle(): (member: PokemonSet) => string {
  const displayName = useDisplayName();
  return (member) =>
    member.nickname?.trim()
      ? member.nickname
      : displayName("species", member.species);
}

/**
 * A team as the in-game Team Preview screen shows it: six slots, always —
 * empty slots are dashed placeholders, so a 1-Pokémon team reads as a
 * two-thirds-empty team, not as a different shape. Each slot's sprite and
 * item icon carry the localized names as their accessible labels, so the
 * list reads out "Garchomp, Life Orb" in both languages.
 */
export function TeamPreview({
  team,
  variant = "compact",
  ariaLabel,
  className,
}: TeamPreviewProps) {
  const t = useT();
  const titleOf = useMemberTitle();
  const label = ariaLabel ?? t("teams.previewAria");

  return (
    <ul
      aria-label={label}
      className={cn(
        "grid gap-2",
        variant === "compact"
          ? "grid-cols-6 gap-1"
          : "grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {Array.from({ length: MAX_TEAM_SIZE }, (_, index) => {
        const member = team.members[index];
        if (!member) {
          return (
            <li
              key={index}
              aria-hidden="true"
              className={cn(
                "list-none rounded-md border border-dashed",
                variant === "compact"
                  ? "size-10 sm:size-11"
                  : "min-h-[104px] bg-card",
                ROW_ENTRANCE,
              )}
              style={{ animationDelay: `${staggerDelay(index)}ms` }}
            />
          );
        }
        return (
          <li
            key={index}
            tabIndex={variant === "expanded" ? 0 : undefined}
            className={cn(
              "group list-none rounded-md transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:bg-accent-brand-subtle focus-visible:bg-accent-brand-subtle focus-visible:outline-2 focus-visible:outline-accent-brand-text",
              variant === "expanded" && "border bg-card",
              ROW_ENTRANCE,
            )}
            style={{ animationDelay: `${staggerDelay(index)}ms` }}
          >
            {variant === "compact" ? (
              <CompactSlot member={member} titleOf={titleOf} />
            ) : (
              <ExpandedSlot member={member} titleOf={titleOf} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** One sprite with its item icon in the corner. */
function CompactSlot({
  member,
  titleOf,
}: {
  member: PokemonSet;
  titleOf: (member: PokemonSet) => string;
}) {
  return (
    <span className="relative block size-10 sm:size-11">
      <PokemonSprite species={member.species} size={40} className="size-full" />
      {member.item ? (
        <ItemIcon
          item={member.item}
          className="absolute right-0 bottom-0 size-4 rounded-sm bg-background"
        />
      ) : null}
      {/* The sprite and the item icon already read out the localized names;
          the title adds the nickname, if the Pokémon has one. */}
      <span className="sr-only">{titleOf(member)}</span>
    </span>
  );
}

/**
 * One slot with its details: sprite, item icon, name, item, ability,
 * nature and the filled move slots.
 */
function ExpandedSlot({
  member,
  titleOf,
}: {
  member: PokemonSet;
  titleOf: (member: PokemonSet) => string;
}) {
  const t = useT();
  const displayName = useDisplayName();
  const itemName = member.item ? displayName("item", member.item) : null;
  const abilityName = member.ability
    ? displayName("ability", member.ability)
    : null;
  const natureName = displayName("nature", member.nature);
  const moves = member.moves.filter((move): move is string => Boolean(move));

  return (
    <span className="block p-3">
      <span className="flex items-start gap-2">
        <span className="relative block shrink-0">
          <PokemonSprite species={member.species} size={56} />
          {member.item ? (
            <ItemIcon
              item={member.item}
              className="absolute right-0 bottom-0 size-4 rounded-md bg-background"
            />
          ) : null}
        </span>
        <span className="block min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {titleOf(member)}
          </span>
          {itemName ? (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {itemName}
            </span>
          ) : null}
          {abilityName ? (
            <span className="block truncate text-xs text-muted-foreground">
              {abilityName}
            </span>
          ) : null}
          <span className="block truncate text-xs text-muted-foreground">
            {natureName}
          </span>
        </span>
      </span>
      {moves.length > 0 ? (
        <span className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
          {moves.map((move) => (
            <span key={move} className="text-xs text-muted-foreground">
              {displayName("move", move)}
            </span>
          ))}
        </span>
      ) : null}
      {/* Nothing above names the nature, so say it for screen readers. */}
      <span className="sr-only">
        {t("teams.previewNatureSr", { nature: natureName })}
      </span>
    </span>
  );
}
