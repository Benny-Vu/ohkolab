import { useId, type Dispatch } from "react";

import { Switch } from "@/components/ui/switch";
import { Panel, PanelTitle } from "@/features/calc/panel";
import {
  SIDE_IDS,
  SIDE_LABELS,
  type CalcAction,
  type CalcState,
  type SideFlag,
  type SideId,
} from "@/lib/calc/state";
import { TERRAINS, WEATHERS, type SideState } from "@/types/battle";

const fieldClass =
  "h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/** The toggles each side of the field carries, in display order. */
const SIDE_FLAGS: { flag: SideFlag; label: string }[] = [
  { flag: "reflect", label: "Reflect" },
  { flag: "lightScreen", label: "Light Screen" },
  { flag: "auroraVeil", label: "Aurora Veil" },
  { flag: "tailwind", label: "Tailwind" },
  { flag: "helpingHand", label: "Helping Hand" },
  { flag: "friendGuard", label: "Friend Guard" },
  { flag: "stealthRock", label: "Stealth Rock" },
];

/** Doubles-only conditions; they do nothing in singles. */
const DOUBLES_FLAGS: SideFlag[] = ["helpingHand", "friendGuard"];

interface FieldPanelProps {
  state: CalcState;
  format: "singles" | "doubles";
  dispatch: Dispatch<CalcAction>;
}

/** The battle field: weather, terrain, gravity and each side's conditions. */
export function FieldPanel({ state, format, dispatch }: FieldPanelProps) {
  const titleId = useId();
  const weatherId = useId();
  const terrainId = useId();

  return (
    <Panel labelledBy={titleId}>
      <PanelTitle id={titleId}>Field</PanelTitle>

      <div className="grid grid-cols-2 gap-2">
        <label
          className="grid gap-1 text-xs text-muted-foreground"
          htmlFor={weatherId}
        >
          Weather
          <select
            id={weatherId}
            className={fieldClass}
            value={state.weather ?? ""}
            onChange={(event) => {
              const weather = WEATHERS.find(
                (name) => name === event.target.value,
              );
              dispatch({ type: "setWeather", weather: weather ?? null });
            }}
          >
            <option value="">None</option>
            {WEATHERS.map((weather) => (
              <option key={weather} value={weather}>
                {weather}
              </option>
            ))}
          </select>
        </label>
        <label
          className="grid gap-1 text-xs text-muted-foreground"
          htmlFor={terrainId}
        >
          Terrain
          <select
            id={terrainId}
            className={fieldClass}
            value={state.terrain ?? ""}
            onChange={(event) => {
              const terrain = TERRAINS.find(
                (name) => name === event.target.value,
              );
              dispatch({ type: "setTerrain", terrain: terrain ?? null });
            }}
          >
            <option value="">None</option>
            {TERRAINS.map((terrain) => (
              <option key={terrain} value={terrain}>
                {terrain}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">Gravity</span>
        <Switch
          checked={state.gravity}
          onCheckedChange={(on) => dispatch({ type: "setGravity", on })}
          aria-label="Gravity"
        />
      </div>

      {SIDE_IDS.map((side) => (
        <SideConditions
          key={side}
          side={side}
          conditions={state.fieldSides[side]}
          format={format}
          dispatch={dispatch}
        />
      ))}
    </Panel>
  );
}

interface SideConditionsProps {
  side: SideId;
  conditions: SideState;
  format: "singles" | "doubles";
  dispatch: Dispatch<CalcAction>;
}

/** One side's half of the field: its screens, support and entry hazards. */
function SideConditions({
  side,
  conditions,
  format,
  dispatch,
}: SideConditionsProps) {
  const label = SIDE_LABELS[side];

  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {SIDE_FLAGS.map(({ flag, label: flagLabel }) => {
        const doublesOnly = DOUBLES_FLAGS.includes(flag);
        return (
          <div key={flag} className="flex items-center justify-between gap-2">
            <span
              className={`text-sm ${doublesOnly && format === "singles" ? "text-muted-foreground/60" : ""}`}
            >
              {flagLabel}
            </span>
            <Switch
              size="sm"
              checked={conditions[flag]}
              disabled={doublesOnly && format === "singles"}
              onCheckedChange={(on) =>
                dispatch({ type: "setSideFlag", side, flag, on })
              }
              aria-label={`${label} ${flagLabel}`}
            />
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">Spikes</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3].map((layers) => (
            <button
              key={layers}
              type="button"
              className={`h-6 w-6 rounded-md border text-xs font-medium tabular-nums ${
                conditions.spikes === layers
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-input bg-transparent text-muted-foreground"
              }`}
              aria-pressed={conditions.spikes === layers}
              aria-label={`${label} Spikes ${layers}`}
              onClick={() => dispatch({ type: "setSpikes", side, layers })}
            >
              {layers}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
