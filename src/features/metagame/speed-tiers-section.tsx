import { PokemonIcon } from "@/components/pokemon-sprite";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatShare } from "@/lib/metagame/format";
import { speedTiers, type SpeedTier } from "@/lib/metagame/speed-tiers";
import type { PokemonUsage } from "@/lib/metagame/types";

function SpeedTierNotes({ tier }: { tier: SpeedTier }) {
  const notes: string[] = [];
  if (tier.choiceScarf) notes.push("Choice Scarf");
  if (tier.unburden) notes.push("Unburden");
  if (notes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {notes.map((note) => (
        <Badge key={note} variant="secondary">
          {note}
        </Badge>
      ))}
    </div>
  );
}

export function SpeedTiersSection({ pokemon }: { pokemon: PokemonUsage[] }) {
  const tiers = speedTiers(pokemon);
  return (
    <section className="space-y-2">
      <h2 className="text-base leading-tight font-semibold">Speed tiers</h2>
      {tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No speed tier data for this snapshot.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pokémon</TableHead>
                <TableHead>Common speeds</TableHead>
                <TableHead className="text-right">Max</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier) => (
                <TableRow key={tier.species}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <PokemonIcon species={tier.species} className="size-6" />
                      <span className="min-w-0 font-medium">
                        {tier.species}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {tier.entries.map((entry, index) => (
                        <span
                          key={`${tier.species}-${entry.speed}-${index}`}
                          className="text-sm tabular-nums"
                        >
                          {entry.nature} {entry.speed} (
                          {formatShare(entry.share)})
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {tier.maxSpeed}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {tier.minSpeed}
                  </TableCell>
                  <TableCell>
                    <SpeedTierNotes tier={tier} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
