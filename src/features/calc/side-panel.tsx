import { useId, type Dispatch } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";

import { PokemonEditor } from "@/components/pokemon-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Panel, PanelTitle } from "@/features/calc/panel";
import {
  MAX_HP_PERCENT,
  MAX_STAGE,
  MIN_HP_PERCENT,
  MIN_STAGE,
  SIDE_LABELS,
  megaFormeOf,
  type CalcAction,
  type CalcSide,
  type SideId,
} from "@/lib/calc/state";
import {
  STATUS_NAMES,
  type BoostStatId,
  type StatusName,
} from "@/types/battle";
import { STAT_LABELS } from "@/types/pokemon";

/** The stats a Pokémon can raise or lower in battle. */
const BOOST_STATS: BoostStatId[] = ["atk", "def", "spa", "spd", "spe"];

/** Friendly names for the status conditions. */
const STATUS_OPTIONS: Record<StatusName, string> = {
  slp: "Sleep",
  psn: "Poison",
  brn: "Burn",
  frz: "Freeze",
  par: "Paralysis",
  tox: "Toxic",
};

const fieldClass =
  "h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

function stageText(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

interface SidePanelProps {
  side: SideId;
  calcSide: CalcSide;
  dispatch: Dispatch<CalcAction>;
}

/** One side of the calculator: its set plus its state in battle. */
export function SidePanel({ side, calcSide, dispatch }: SidePanelProps) {
  const titleId = useId();
  const statusId = useId();
  const hpId = useId();
  const label = SIDE_LABELS[side];
  const megaForme = megaFormeOf(calcSide.set);
  const critSlots = calcSide.set.moves
    .map((move, slot) => ({ move, slot }))
    .filter(
      (entry): entry is { move: string; slot: number } => entry.move !== null,
    );

  return (
    <Panel labelledBy={titleId}>
      <PanelTitle id={titleId}>{label}</PanelTitle>
      <PokemonEditor
        value={calcSide.set}
        onChange={(set) => dispatch({ type: "setSet", side, set })}
        allowBattleOnly
      />

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Stat boosts
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => dispatch({ type: "clearBoosts", side })}
            >
              Clear
            </Button>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-x-6">
            {BOOST_STATS.map((stat) => {
              const value = calcSide.boosts[stat];
              return (
                <div key={stat} className="flex items-center gap-2">
                  <span className="w-8 text-xs text-muted-foreground">
                    {STAT_LABELS[stat]}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      aria-label={`${label} ${STAT_LABELS[stat]} boost down`}
                      disabled={value <= MIN_STAGE}
                      onClick={() =>
                        dispatch({
                          type: "setBoost",
                          side,
                          stat,
                          value: value - 1,
                        })
                      }
                    >
                      <MinusIcon />
                    </Button>
                    <span className="w-7 text-center text-sm font-medium tabular-nums">
                      {stageText(value)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      aria-label={`${label} ${STAT_LABELS[stat]} boost up`}
                      disabled={value >= MAX_STAGE}
                      onClick={() =>
                        dispatch({
                          type: "setBoost",
                          side,
                          stat,
                          value: value + 1,
                        })
                      }
                    >
                      <PlusIcon />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label
            className="grid gap-1 text-xs text-muted-foreground"
            htmlFor={statusId}
          >
            Status
            <select
              id={statusId}
              className={fieldClass}
              value={calcSide.status ?? ""}
              onChange={(event) => {
                const status = STATUS_NAMES.find(
                  (name) => name === event.target.value,
                );
                dispatch({ type: "setStatus", side, status: status ?? null });
              }}
            >
              <option value="">None</option>
              {STATUS_NAMES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_OPTIONS[status]}
                </option>
              ))}
            </select>
          </label>
          <label
            className="grid gap-1 text-xs text-muted-foreground"
            htmlFor={hpId}
          >
            Current HP %
            <Input
              id={hpId}
              type="number"
              min={MIN_HP_PERCENT}
              max={MAX_HP_PERCENT}
              value={calcSide.hpPercent}
              onChange={(event) =>
                dispatch({
                  type: "setHpPercent",
                  side,
                  value: Number(event.target.value),
                })
              }
            />
          </label>
        </div>

        {megaForme ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">
              Mega Evolution{" "}
              <span className="text-muted-foreground">({megaForme})</span>
            </span>
            <Switch
              checked={calcSide.mega}
              onCheckedChange={(on) => dispatch({ type: "setMega", side, on })}
              aria-label={`${label} Mega Evolution`}
            />
          </div>
        ) : null}

        {critSlots.length > 0 ? (
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Critical hits
            </span>
            {critSlots.map(({ move, slot }) => (
              <div
                key={slot}
                className="flex items-center justify-between gap-2"
              >
                <span className="min-w-0 truncate text-sm">{move}</span>
                <Switch
                  size="sm"
                  checked={calcSide.crits[slot] ?? false}
                  onCheckedChange={(on) =>
                    dispatch({ type: "setCrit", side, slot, on })
                  }
                  aria-label={`${label} ${move} critical hit`}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
