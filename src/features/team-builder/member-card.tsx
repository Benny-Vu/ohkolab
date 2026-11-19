import type { ReactNode } from "react";

import { ItemIcon, PokemonSprite } from "@/components/pokemon-sprite";
import { StatBar } from "@/components/stat-bar";
import { TypeBadge } from "@/components/type-badge";
import { statLabel } from "@/components/stat-labels";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { calcStats, useDisplayName } from "@/data";
import { battleTypes, memberLabel } from "@/lib/team";
import { useT } from "@/lib/i18n/t";
import { STAT_IDS, type PokemonSet } from "@/types/pokemon";

/**
 * One team member as a display card: sprite, name, types, item, ability,
 * moves and final stats, plus an optional footer of controls. Shared by
 * the editable team detail page (edit, move, remove) and the public,
 * read-only team page (no footer).
 */
export function MemberCard({
  member,
  footer,
}: {
  member: PokemonSet;
  footer?: ReactNode;
}) {
  const t = useT();
  const displayName = useDisplayName();
  const label = displayName("species", memberLabel(member));
  const types = battleTypes(member) ?? [];
  const finalStats = calcStats(member);
  const meta = [
    member.item ? displayName("item", member.item) : null,
    member.ability ? displayName("ability", member.ability) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const moves = member.moves
    .filter((move): move is string => Boolean(move))
    .map((move) => displayName("move", move))
    .join(" · ");

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <PokemonSprite species={member.species} size={64} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{label}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {types.map((type) => (
                <TypeBadge key={type} type={type} />
              ))}
            </div>
            {meta ? (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                {member.item ? (
                  <ItemIcon item={member.item} className="size-3.5 shrink-0" />
                ) : null}
                <span className="truncate">{meta}</span>
              </p>
            ) : null}
          </div>
        </div>
        {moves ? (
          <p className="text-xs text-muted-foreground">{moves}</p>
        ) : null}
        <div className="grid grid-cols-6 gap-1.5">
          {STAT_IDS.map((stat) => (
            <div key={stat} className="flex flex-col gap-1">
              <span className="flex items-baseline justify-between gap-1">
                <span className="text-[9px] text-muted-foreground">
                  {statLabel(t, stat)}
                </span>
                <span className="font-mono text-[10px] tabular-nums">
                  {finalStats[stat]}
                </span>
              </span>
              <StatBar value={finalStats[stat]} max={200} className="h-1!" />
            </div>
          ))}
        </div>
      </CardContent>
      {footer ? (
        <CardFooter className="flex-wrap gap-1">{footer}</CardFooter>
      ) : null}
    </Card>
  );
}
