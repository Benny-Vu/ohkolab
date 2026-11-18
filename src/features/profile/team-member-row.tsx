import { ItemIcon, PokemonSprite } from "@/components/pokemon-sprite";
import { TypeBadge } from "@/components/type-badge";
import { battleTypes, memberLabel } from "@/lib/team/analysis";
import { useDisplayName } from "@/data";
import { useT } from "@/lib/i18n/t";
import type { Team } from "@/types/team";

export function TeamMemberRow({ team, index }: { team: Team; index: number }) {
  const t = useT();
  const display = useDisplayName();
  const member = team.members[index];
  if (!member) {
    return null;
  }
  const types = battleTypes(member);
  return (
    <li className="flex min-w-0 items-center gap-3">
      <PokemonSprite species={member.species} size={48} className="shrink-0" />
      <div className="grid min-w-0 flex-1 gap-1">
        <span className="min-w-0 truncate text-sm font-medium">
          {display("species", memberLabel(member))}
        </span>
        <div className="flex min-w-0 flex-wrap gap-1">
          {types ? (
            types.map((type) => <TypeBadge key={type} type={type} />)
          ) : (
            <span className="text-xs text-muted-foreground">
              {t("publicProfile.unknownTypes")}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {member.item ? (
            <>
              <ItemIcon item={member.item} className="shrink-0" />
              <span className="min-w-0 truncate">
                {display("item", member.item)}
              </span>
            </>
          ) : (
            <span>{t("publicProfile.noItem")}</span>
          )}
        </div>
        <p className="min-w-0 text-xs text-muted-foreground">
          {member.moves
            .filter((move) => move !== null)
            .map((move) => display("move", move))
            .join(" · ") || t("publicProfile.noMoves")}
        </p>
      </div>
    </li>
  );
}
