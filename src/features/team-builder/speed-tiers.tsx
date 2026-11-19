import { useState } from "react";

import { PokemonIcon } from "@/components/pokemon-sprite";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDisplayName } from "@/data/display-names";
import { useT } from "@/lib/i18n/t";
import { speedTiers, type SpeedTierMode } from "@/lib/team";
import type { PokemonSet } from "@/types/pokemon";

interface SpeedTiersProps {
  members: PokemonSet[];
}

const MODES: {
  value: SpeedTierMode;
  key: "speedBase" | "speedScarf" | "speedTailwind" | "speedTrickRoom";
}[] = [
  { value: "base", key: "speedBase" },
  { value: "scarf", key: "speedScarf" },
  { value: "tailwind", key: "speedTailwind" },
  { value: "trickRoom", key: "speedTrickRoom" },
];

export function SpeedTiers({ members }: SpeedTiersProps) {
  const t = useT();
  const displayName = useDisplayName();
  const [mode, setMode] = useState<SpeedTierMode>("base");
  const tiers = speedTiers(members, mode);

  return (
    <div className="flex flex-col gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={mode}
        aria-label={t("teams.speedViewLabel")}
        onValueChange={(value) => {
          if (value) setMode(value as SpeedTierMode);
        }}
        className="flex-wrap"
      >
        {MODES.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {t(`teams.${option.key}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {mode === "trickRoom" && (
        <p className="text-xs text-muted-foreground">
          {t("teams.trickRoomNote")}
        </p>
      )}
      {tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("teams.noMembers")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {tiers.map((tier, index) => (
            <li
              key={`${tier.member.species}-${index}`}
              className="flex items-center gap-2 py-1.5"
            >
              <PokemonIcon species={tier.member.species} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {displayName("species", tier.label)}
              </span>
              <span className="font-mono text-sm tabular-nums">
                {tier.speed}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
