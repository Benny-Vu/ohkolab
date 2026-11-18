import { useId, type Dispatch } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";

import { Picker, type PickerOption } from "@/components/picker";
import { PokemonEditor } from "@/components/pokemon-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CALC_SIDE_LABELS, Panel, PanelTitle } from "@/features/calc/panel";
import {
  MAX_HP_PERCENT,
  MAX_STAGE,
  MIN_HP_PERCENT,
  MIN_STAGE,
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

/** Status choices for the picker, with None first. */
const STATUS_PICKER_OPTIONS: PickerOption[] = [
  { value: "", label: "None" },
  ...STATUS_NAMES.map((status) => ({
    value: status,
    label: STATUS_OPTIONS[status],
  })),
];

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
  const hpId = useId();
  const label = CALC_SIDE_LABELS[side];
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
                      size="icon-sm"
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
                      size="icon-sm"
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
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">Status</span>
            <Picker
              options={STATUS_PICKER_OPTIONS}
              value={calcSide.status ?? ""}
              onValueChange={(value) =>
                dispatch({
                  type: "setStatus",
                  side,
                  status: STATUS_NAMES.find((name) => name === value) ?? null,
                })
              }
              aria-label={`${label} status`}
            />
          </div>
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
                <span className="text-sm">{move}</span>
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
