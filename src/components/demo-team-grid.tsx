import { ExampleBadge } from "@/components/demo-badge";
import { PokemonSprite } from "@/components/pokemon-sprite";
import type { TranslationKey } from "@/lib/i18n/en";
import { useT } from "@/lib/i18n/t";
import type { BattleFormat } from "@/types/battle";

/**
 * Sample teams for recording mode (?demo=1), shown in place of the teams
 * page's empty state. Render-only: the cards are not clickable and their
 * data never exists — nothing here posts or changes data. The names come
 * from the tools dictionary.
 */
interface DemoTeamFixture {
  nameKey: TranslationKey;
  format: BattleFormat;
  species: string[];
}

const DEMO_TEAMS: DemoTeamFixture[] = [
  {
    nameKey: "demo.team1Name",
    format: "doubles",
    species: [
      "Pelipper",
      "Archaludon",
      "Barraskewda",
      "Ferrothorn",
      "Amoonguss",
      "Tornadus",
    ],
  },
  {
    nameKey: "demo.team2Name",
    format: "singles",
    species: [
      "Garchomp",
      "Flutter Mane",
      "Iron Bundle",
      "Dragonite",
      "Amoonguss",
      "Ceruledge",
    ],
  },
];

/** Sample team cards, each marked as an example and not clickable. */
export function DemoTeamGrid() {
  const t = useT();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {DEMO_TEAMS.map((team) => (
        <div key={team.nameKey} className="rounded-md border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-heading text-sm font-semibold">
              {t(team.nameKey)}
            </p>
            <ExampleBadge />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {team.format === "doubles"
              ? t("demo.formatDoubles")
              : t("demo.formatSingles")}
          </p>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {team.species.map((species) => (
              <li key={species} className="flex justify-center">
                <PokemonSprite species={species} size={48} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
