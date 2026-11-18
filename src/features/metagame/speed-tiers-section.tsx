import { PokemonIcon } from "@/components/pokemon-sprite";
import { StatBar } from "@/components/stat-bar";
import { Badge } from "@/components/ui/badge";
import { useDisplayName } from "@/data/display-names";
import { useT } from "@/lib/i18n/t";
import { formatShare } from "@/lib/metagame/format";
import { speedTiers, type SpeedTier } from "@/lib/metagame/speed-tiers";
import type { PokemonUsage } from "@/lib/metagame/types";

function SpeedTierNotes({ tier }: { tier: SpeedTier }) {
  const displayName = useDisplayName();
  const notes: { id: string; kind: "item" | "ability" }[] = [];
  if (tier.choiceScarf) notes.push({ id: "Choice Scarf", kind: "item" });
  if (tier.unburden) notes.push({ id: "Unburden", kind: "ability" });
  if (notes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {notes.map((note) => (
        <Badge key={note.id} variant="secondary">
          {displayName(note.kind, note.id)}
        </Badge>
      ))}
    </div>
  );
}

/** One species in the tier list: header row plus a bar per common speed. */
function SpeedTierRow({ tier }: { tier: SpeedTier }) {
  const t = useT();
  const displayName = useDisplayName();
  return (
    <li className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <PokemonIcon species={tier.species} className="size-6 shrink-0" />
          <span className="min-w-0 truncate font-medium">
            {displayName("species", tier.species)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SpeedTierNotes tier={tier} />
          <span className="text-xs tabular-nums text-muted-foreground">
            {t("meta.maxMinSpeed", { max: tier.maxSpeed, min: tier.minSpeed })}
          </span>
        </div>
      </div>
      {tier.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("meta.noSpreadData")}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {tier.entries.map((entry, index) => (
            <li
              key={`${tier.species}-${entry.speed}-${index}`}
              className="flex items-center gap-2"
            >
              <span className="w-14 shrink-0 text-xs text-muted-foreground">
                {displayName("nature", entry.nature)}
              </span>
              <span className="w-10 shrink-0 text-sm font-medium tabular-nums">
                {entry.speed}
              </span>
              <StatBar
                value={entry.share * 100}
                max={100}
                tone="accent"
                className="min-w-8 flex-1"
              />
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {formatShare(entry.share)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function SpeedTiersSection({ pokemon }: { pokemon: PokemonUsage[] }) {
  const t = useT();
  const tiers = speedTiers(pokemon);
  return (
    <section className="space-y-2">
      <h2 className="text-base leading-tight font-semibold">
        {t("meta.speedTiers")}
      </h2>
      {tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("meta.noTierData")}</p>
      ) : (
        <ol className="space-y-1.5">
          {tiers.map((tier) => (
            <SpeedTierRow key={tier.species} tier={tier} />
          ))}
        </ol>
      )}
    </section>
  );
}
