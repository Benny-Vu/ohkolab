import { PokemonIcon } from "@/components/pokemon-sprite";
import { speedTiers } from "@/lib/team";
import type { PokemonSet } from "@/types/pokemon";

interface SpeedTiersProps {
  members: PokemonSet[];
}

export function SpeedTiers({ members }: SpeedTiersProps) {
  const tiers = speedTiers(members);

  if (tiers.length === 0) {
    return <p className="text-sm text-muted-foreground">No Pokémon on this team yet.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {tiers.map((tier, index) => (
        <li key={`${tier.member.species}-${index}`} className="flex items-center gap-2 py-1.5">
          <PokemonIcon species={tier.member.species} />
          <span className="min-w-0 flex-1 truncate text-sm">{tier.label}</span>
          <span className="font-mono text-sm tabular-nums">{tier.speed}</span>
        </li>
      ))}
    </ul>
  );
}
