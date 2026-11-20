import { ExampleBadge } from "@/components/demo-badge";
import { PokemonSprite } from "@/components/pokemon-sprite";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import type { TranslationKey } from "@/lib/i18n/en";
import { useT } from "@/lib/i18n/t";

/**
 * Sample battle requests for recording mode (?demo=1), shown under the
 * board's sign-in card. Render-only: no offer or overflow actions and no
 * links — nothing here posts or changes data. The rules and notes come from
 * the battles dictionary, so Japanese recordings show Japanese sample
 * content.
 */
interface DemoBattleFixture {
  username: string;
  displayName: string;
  avatarSpecies: string;
  /** Doubles or singles, for the format badge. */
  format: "doubles" | "singles";
  rulesKey: TranslationKey;
  noteKey?: TranslationKey;
  /** A few team species, shown as a compact sprite row. */
  teamSpecies: string[];
}

const DEMO_BATTLES: DemoBattleFixture[] = [
  {
    username: "rikachu",
    displayName: "Rika",
    avatarSpecies: "Garchomp",
    format: "doubles",
    rulesKey: "demo.battle1Rules",
    noteKey: "demo.battle1Note",
    teamSpecies: ["Garchomp", "Flutter Mane", "Amoonguss"],
  },
  {
    username: "kendoubles",
    displayName: "Kenta",
    avatarSpecies: "Flutter Mane",
    format: "doubles",
    rulesKey: "demo.battle2Rules",
    noteKey: "demo.battle2Note",
    teamSpecies: ["Pelipper", "Basculegion"],
  },
  {
    username: "mioteams",
    displayName: "Mio",
    avatarSpecies: "Amoonguss",
    format: "singles",
    rulesKey: "demo.battle3Rules",
    teamSpecies: ["Dragapult", "Grimmsnarl"],
  },
];

/** Sample requests styled like the real board, each marked as an example. */
export function DemoBattleList() {
  const t = useT();
  return (
    <ul className="grid gap-3">
      {DEMO_BATTLES.map((battle) => (
        <li
          key={battle.username}
          className="rounded-md border bg-card p-4 text-left"
        >
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar
              username={battle.username}
              displayName={battle.displayName}
              avatarSpecies={battle.avatarSpecies}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {battle.displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{battle.username}
              </p>
            </div>
            <ExampleBadge />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {t(
                battle.format === "doubles"
                  ? "battles.formatDoubles"
                  : "battles.formatSingles",
              )}
            </Badge>
          </div>
          <p className="mt-2 font-heading text-sm font-semibold">
            {t(battle.rulesKey)}
          </p>
          {battle.noteKey && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t(battle.noteKey)}
            </p>
          )}
          <ul className="mt-3 flex items-center gap-2" aria-hidden="true">
            {battle.teamSpecies.map((species) => (
              <li key={species} className="list-none">
                <PokemonSprite species={species} size={32} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
