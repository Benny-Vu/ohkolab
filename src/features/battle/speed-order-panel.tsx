import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PokemonIcon } from "@/components/pokemon-sprite";
import { switchHitClass } from "@/components/touch-targets";
import { Panel, PanelTitle } from "@/features/calc/panel";
import { useDisplayName } from "@/data/display-names";
import { useT } from "@/lib/i18n/t";
import type { PokemonSet } from "@/types/pokemon";
import type { OpponentInput } from "@/features/battle/opponent-input";
import {
  EMPTY_SPEED_TOGGLES,
  orderSpeedRows,
  speedRows,
  type SpeedMember,
  type SpeedToggles,
} from "@/features/battle/speed-order";

interface SpeedOrderPanelProps {
  mySets: PokemonSet[];
  opponents: OpponentInput[];
}

/**
 * One list of all twelve, fastest first: Tailwind per side, Trick Room and a
 * per-Pokémon Choice Scarf re-order it live, with the Speed values shown so
 * the order is never a mystery.
 */
export function SpeedOrderPanel({ mySets, opponents }: SpeedOrderPanelProps) {
  const t = useT();
  const displayName = useDisplayName();
  const titleId = useId();
  const [toggles, setToggles] = useState<SpeedToggles>(EMPTY_SPEED_TOGGLES);

  const members: SpeedMember[] = [
    ...mySets.map((set, index) => ({
      key: `mine-${index}`,
      name: set.nickname?.trim() || set.species,
      species: set.species,
      side: "mine" as const,
      set,
    })),
    ...opponents.map((opponent, index) => ({
      key: `theirs-${index}`,
      name: opponent.set.nickname?.trim() || opponent.species,
      species: opponent.species,
      side: "theirs" as const,
      set: opponent.set,
    })),
  ];

  const rows = orderSpeedRows(speedRows(members, toggles), toggles.trickRoom);

  const toggle = (patch: Partial<SpeedToggles>) =>
    setToggles((current) => ({ ...current, ...patch }));

  const toggleScarf = (key: string, on: boolean) =>
    setToggles((current) => ({
      ...current,
      scarves: { ...current.scarves, [key]: on },
    }));

  const fieldToggles: { key: BooleanToggleKey; label: string }[] = [
    { key: "myTailwind", label: t("battle.tailwindMine") },
    { key: "theirTailwind", label: t("battle.tailwindTheirs") },
    { key: "trickRoom", label: t("calc.trickRoom") },
  ];

  return (
    <Panel labelledBy={titleId}>
      <PanelTitle id={titleId}>{t("battle.speedTitle")}</PanelTitle>

      <div className="flex flex-wrap gap-4">
        {fieldToggles.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <Switch
              id={`${titleId}-${key}`}
              className={switchHitClass}
              checked={Boolean(toggles[key])}
              onCheckedChange={(on) => toggle({ [key]: on })}
            />
            <Label htmlFor={`${titleId}-${key}`} className="text-sm">
              {label}
            </Label>
          </div>
        ))}
      </div>

      {rows.length > 0 ? (
        <ol aria-label={t("battle.speedAria")} className="grid gap-1.5">
          {rows.map((row, index) => {
            const modifiers: { key: string; label: string }[] = [];
            if (row.tailwind)
              modifiers.push({
                key: "tailwind",
                label: t("calc.speedTailwind"),
              });
            if (row.scarf)
              modifiers.push({ key: "scarf", label: t("battle.scarf") });
            return (
              <li
                key={row.key}
                className="flex min-h-11 items-center gap-2 rounded-md px-1"
              >
                <span className="w-5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <span aria-hidden className="flex size-8 shrink-0">
                  <PokemonIcon species={row.species} className="size-8" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {displayName("species", row.species)}
                    </span>
                    <span className="shrink-0 text-2xs text-muted-foreground">
                      {row.side === "mine"
                        ? t("battle.sideYou")
                        : t("battle.sideOpponent")}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {modifiers.map((modifier) => (
                      <Badge
                        key={modifier.key}
                        variant="outline"
                        className="px-1 text-2xs"
                      >
                        {modifier.label}
                      </Badge>
                    ))}
                  </span>
                </span>
                <span
                  className="shrink-0 text-right font-mono text-sm tabular-nums"
                  aria-label={t("battle.speedValueSr", {
                    name: displayName("species", row.species),
                    base: row.base,
                    final: row.final,
                  })}
                >
                  {row.final}
                  <span className="ml-1 text-2xs text-muted-foreground">
                    ({row.base})
                  </span>
                </span>
                <Switch
                  className={`${switchHitClass} shrink-0`}
                  checked={toggles.scarves[row.key] === true}
                  onCheckedChange={(on) => toggleScarf(row.key, on)}
                  aria-label={t("battle.scarfAria", {
                    name: displayName("species", row.species),
                  })}
                />
              </li>
            );
          })}
        </ol>
      ) : null}
    </Panel>
  );
}

/** The `SpeedToggles` keys that are plain booleans. */
type BooleanToggleKey = "myTailwind" | "theirTailwind" | "trickRoom";
