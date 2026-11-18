import { useId, type Dispatch } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";

import { Picker, type PickerOption } from "@/components/picker";
import { PokemonEditor } from "@/components/pokemon-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Panel, PanelTitle } from "@/features/calc/panel";
import { calcSideLabel } from "@/features/calc/side-labels";
import { statLabel } from "@/components/stat-labels";
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
import { useT } from "@/lib/i18n/t";
import {
  STATUS_NAMES,
  type BoostStatId,
  type StatusName,
} from "@/types/battle";
import type { TranslationKey } from "@/lib/i18n/en";

/** The stats a PokÃ©mon can raise or lower in battle. */
const BOOST_STATS: BoostStatId[] = ["atk", "def", "spa", "spd", "spe"];

/** Friendly names for the status conditions, as translation keys. */
const STATUS_LABEL_KEYS: Record<StatusName, TranslationKey> = {
  slp: "calc.statusSlp",
  psn: "calc.statusPsn",
  brn: "calc.statusBrn",
  frz: "calc.statusFrz",
  par: "calc.statusPar",
  tox: "calc.statusTox",
};

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
  const t = useT();
  const titleId = useId();
  const hpId = useId();
  const label = calcSideLabel(t, side);
  const megaForme = megaFormeOf(calcSide.set);
  const critSlots = calcSide.set.moves
    .map((move, slot) => ({ move, slot }))
    .filter(
      (entry): entry is { move: string; slot: number } => entry.move !== null,
    );

  const statusPickerOptions: PickerOption[] = [
    { value: "", label: t("calc.none") },
    ...STATUS_NAMES.map((status) => ({
      value: status,
      label: t(STATUS_LABEL_KEYS[status]),
    })),
  ];

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
              {t("calc.statBoosts")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => dispatch({ type: "clearBoosts", side })}
            >
              {t("calc.clear")}
            </Button>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-x-6">
            {BOOST_STATS.map((stat) => {
              const value = calcSide.boosts[stat];
              return (
                <div key={stat} className="flex items-center gap-2">
                  <span className="w-10 text-xs text-muted-foreground">
                    {statLabel(t, stat)}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={t("calc.boostDown", {
                        side: label,
                        stat: statLabel(t, stat),
                      })}
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
                      aria-label={t("calc.boostUp", {
                        side: label,
                        stat: statLabel(t, stat),
                      })}
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
            <span className="text-xs text-muted-foreground">
              {t("calc.status")}
            </span>
            <Picker
              options={statusPickerOptions}
              value={calcSide.status ?? ""}
              onValueChange={(value) =>
                dispatch({
                  type: "setStatus",
                  side,
                  status: STATUS_NAMES.find((name) => name === value) ?? null,
                })
              }
              aria-label={t("calc.statusAria", { side: label })}
            />
          </div>
          <label
            className="grid gap-1 text-xs text-muted-foreground"
            htmlFor={hpId}
          >
            {t("calc.currentHp")}
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
              {t("calc.megaEvolution")}{" "}
              <span className="text-muted-foreground">({megaForme})</span>
            </span>
            <Switch
              checked={calcSide.mega}
              onCheckedChange={(on) => dispatch({ type: "setMega", side, on })}
              aria-label={t("calc.megaAria", { side: label })}
            />
          </div>
        ) : null}

        {critSlots.length > 0 ? (
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("calc.criticalHits")}
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
                  aria-label={t("calc.critAria", { side: label, move })}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
