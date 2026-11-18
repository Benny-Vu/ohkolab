import { Link } from "react-router";

import { BigNumber } from "@/components/big-number";
import { PokemonIcon } from "@/components/pokemon-sprite";
import { StatBar } from "@/components/stat-bar";
import { useMetagameSnapshot } from "@/features/metagame/use-metagame";
import { formatPercent } from "@/lib/i18n/format";
import { useT } from "@/lib/i18n/t";

/**
 * Three most-used Pokémon in doubles with their usage share. Shown on phones
 * above the feed; the data loads lazily with the component.
 */
export function TrendingStrip() {
  const t = useT();
  const snapshot = useMetagameSnapshot("doubles", null);
  const top = (snapshot.data?.pokemon ?? [])
    .filter((entry) => entry.usage !== null)
    .slice(0, 3);

  if (top.length === 0) return null;

  return (
    <section
      aria-label={t("home.trending")}
      className="rounded-md border bg-card p-3"
    >
      <h2 className="font-heading text-sm font-semibold">
        {t("home.trending")}
      </h2>
      <ul className="mt-2 grid grid-cols-3 gap-2">
        {top.map((entry) => {
          const percent = entry.usage === null ? 0 : entry.usage * 100;
          return (
            <li key={entry.species}>
              <Link
                to="/meta"
                className="grid gap-1 rounded-md p-2 transition-colors duration-150 ease-out hover:bg-surface-sunken"
              >
                <PokemonIcon species={entry.species} className="size-8" />
                <span className="truncate text-xs font-medium">
                  {entry.species}
                </span>
                <BigNumber size="md" className="text-lg leading-none">
                  {formatPercent(percent / 100)}
                </BigNumber>
                <StatBar value={percent} max={100} tone="accent" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
