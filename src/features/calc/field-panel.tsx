import { useId, useState, type Dispatch } from "react";
import { ChevronDownIcon } from "lucide-react";

import { Picker, type PickerOption } from "@/components/picker";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Panel, PanelTitle } from "@/features/calc/panel";
import { calcSideLabel } from "@/features/calc/side-labels";
import type { Translate } from "@/components/stat-labels";
import type { TranslationKey } from "@/lib/i18n/en";
import { useT } from "@/lib/i18n/t";
import {
  SIDE_IDS,
  type CalcAction,
  type CalcState,
  type SideFlag,
  type SideId,
} from "@/lib/calc/state";
import { useBattleFormat } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import {
  TERRAINS,
  WEATHERS,
  type BattleFormat,
  type SideState,
  type Terrain,
  type Weather,
} from "@/types/battle";

/** Weather choices for the picker, with None first. */
function weatherOptions(t: Translate): PickerOption[] {
  return [
    { value: "", label: t("calc.none") },
    ...WEATHERS.map((weather) => ({
      value: weather,
      label: t(WEATHER_LABEL_KEYS[weather]),
    })),
  ];
}

const WEATHER_LABEL_KEYS: Record<Weather, TranslationKey> = {
  Sun: "calc.weatherSun",
  Rain: "calc.weatherRain",
  Sand: "calc.weatherSand",
  Snow: "calc.weatherSnow",
};

const TERRAIN_LABEL_KEYS: Record<Terrain, TranslationKey> = {
  Electric: "calc.terrainElectric",
  Grassy: "calc.terrainGrassy",
  Psychic: "calc.terrainPsychic",
  Misty: "calc.terrainMisty",
};

/** Terrain choices for the picker, with None first. */
function terrainOptions(t: Translate): PickerOption[] {
  return [
    { value: "", label: t("calc.none") },
    ...TERRAINS.map((terrain) => ({
      value: terrain,
      label: t(TERRAIN_LABEL_KEYS[terrain]),
    })),
  ];
}

/**
 * The screens, support and hazards every side can carry. These labels are
 * move names (Reflect, Stealth Rock, ...) and stay English until the
 * ja-names stream's `displayName` lands.
 */
const SIDE_FLAGS: { flag: SideFlag; label: string }[] = [
  { flag: "reflect", label: "Reflect" },
  { flag: "lightScreen", label: "Light Screen" },
  { flag: "auroraVeil", label: "Aurora Veil" },
  { flag: "tailwind", label: "Tailwind" },
  { flag: "stealthRock", label: "Stealth Rock" },
];

/** Doubles-only conditions; they do nothing in singles. */
const DOUBLES_FLAGS: { flag: SideFlag; label: string }[] = [
  { flag: "helpingHand", label: "Helping Hand" },
  { flag: "friendGuard", label: "Friend Guard" },
];

const ALL_SIDE_FLAGS = [...SIDE_FLAGS, ...DOUBLES_FLAGS];

/** Short summary of a side's active conditions, for the field bar buttons. */
function activeConditionsText(conditions: SideState, t: Translate): string {
  const active = ALL_SIDE_FLAGS.filter(({ flag }) => conditions[flag]).map(
    ({ label }) => label,
  );
  if (conditions.spikes > 0) active.push("Spikes");
  return active.length > 0 ? active.join(", ") : t("calc.noConditions");
}

/** The singles/doubles switch, bound to the app-wide preference. */
function FormatControl({ className }: { className?: string }) {
  const [format, setFormat] = useBattleFormat();
  const t = useT();
  return (
    <SegmentedControl
      options={[
        { value: "singles", label: t("calc.formatSingles") },
        { value: "doubles", label: t("calc.formatDoubles") },
      ]}
      value={format}
      onValueChange={(value) => setFormat(value as BattleFormat)}
      aria-label={t("calc.battleFormat")}
      className={className}
    />
  );
}

interface FieldPickerProps {
  state: CalcState;
  dispatch: Dispatch<CalcAction>;
  className?: string;
}

/** Weather picker bound to the calculator state. */
function WeatherPicker({ state, dispatch, className }: FieldPickerProps) {
  const t = useT();
  return (
    <Picker
      options={weatherOptions(t)}
      value={state.weather ?? ""}
      onValueChange={(value) =>
        dispatch({
          type: "setWeather",
          weather: WEATHERS.find((name) => name === value) ?? null,
        })
      }
      aria-label={t("calc.weather")}
      className={className}
    />
  );
}

/** Terrain picker bound to the calculator state. */
function TerrainPicker({ state, dispatch, className }: FieldPickerProps) {
  const t = useT();
  return (
    <Picker
      options={terrainOptions(t)}
      value={state.terrain ?? ""}
      onValueChange={(value) =>
        dispatch({
          type: "setTerrain",
          terrain: TERRAINS.find((name) => name === value) ?? null,
        })
      }
      aria-label={t("calc.terrain")}
      className={className}
    />
  );
}

interface ConditionRowsProps {
  side: SideId;
  conditions: SideState;
  flags: { flag: SideFlag; label: string }[];
  disabled?: boolean;
  dispatch: Dispatch<CalcAction>;
}

/** Switch rows for one side's field conditions. */
function ConditionRows({
  side,
  conditions,
  flags,
  disabled,
  dispatch,
}: ConditionRowsProps) {
  const t = useT();
  const label = calcSideLabel(t, side);

  return (
    <>
      {flags.map(({ flag, label: flagLabel }) => (
        <div key={flag} className="flex items-center justify-between gap-2">
          <span
            className={cn("text-sm", disabled && "text-muted-foreground/60")}
          >
            {flagLabel}
          </span>
          <Switch
            size="sm"
            checked={conditions[flag]}
            disabled={disabled}
            onCheckedChange={(on) =>
              dispatch({ type: "setSideFlag", side, flag, on })
            }
            aria-label={`${label} ${flagLabel}`}
          />
        </div>
      ))}
    </>
  );
}

interface SpikesControlProps {
  side: SideId;
  conditions: SideState;
  dispatch: Dispatch<CalcAction>;
}

/** Layer picker for one side's Spikes. */
function SpikesControl({ side, conditions, dispatch }: SpikesControlProps) {
  const t = useT();
  const label = calcSideLabel(t, side);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">Spikes</span>
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3].map((layers) => (
          <button
            key={layers}
            type="button"
            className={cn(
              "h-6 w-6 rounded-md border text-xs font-medium tabular-nums",
              conditions.spikes === layers
                ? "border-accent-brand-text bg-accent-brand/15 text-accent-brand-text"
                : "border-input bg-transparent text-muted-foreground",
            )}
            aria-pressed={conditions.spikes === layers}
            aria-label={`${label} Spikes ${layers}`}
            onClick={() => dispatch({ type: "setSpikes", side, layers })}
          >
            {layers}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SideConditionsProps {
  side: SideId;
  conditions: SideState;
  dispatch: Dispatch<CalcAction>;
}

/** One side's screens, support and entry hazards. */
function SideConditions({ side, conditions, dispatch }: SideConditionsProps) {
  const t = useT();
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {calcSideLabel(t, side)}
      </span>
      <ConditionRows
        side={side}
        conditions={conditions}
        flags={SIDE_FLAGS}
        dispatch={dispatch}
      />
      <SpikesControl side={side} conditions={conditions} dispatch={dispatch} />
    </div>
  );
}

interface DoublesConditionsProps {
  side: SideId;
  conditions: SideState;
  format: BattleFormat;
  dispatch: Dispatch<CalcAction>;
}

/** One side's doubles-only conditions, inert in singles. */
function DoublesConditions({
  side,
  conditions,
  format,
  dispatch,
}: DoublesConditionsProps) {
  const t = useT();
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {calcSideLabel(t, side)}
      </span>
      <ConditionRows
        side={side}
        conditions={conditions}
        flags={DOUBLES_FLAGS}
        disabled={format === "singles"}
        dispatch={dispatch}
      />
    </div>
  );
}

interface FieldBarProps {
  state: CalcState;
  dispatch: Dispatch<CalcAction>;
}

/** Desktop field bar: format, weather, terrain and side conditions inline. */
export function FieldBar({ state, dispatch }: FieldBarProps) {
  const [format] = useBattleFormat();
  const t = useT();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FormatControl />
      <WeatherPicker state={state} dispatch={dispatch} className="w-32" />
      <TerrainPicker state={state} dispatch={dispatch} className="w-32" />
      {SIDE_IDS.map((side) => (
        <Popover key={side}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              {calcSideLabel(t, side)} Â·{" "}
              {activeConditionsText(state.fieldSides[side], t)}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            <SideConditions
              side={side}
              conditions={state.fieldSides[side]}
              dispatch={dispatch}
            />
          </PopoverContent>
        </Popover>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            {t("calc.moreConditions")}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Gravity</span>
              <Switch
                checked={state.gravity}
                onCheckedChange={(on) => dispatch({ type: "setGravity", on })}
                aria-label="Gravity"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Trick Room</span>
              <Switch
                checked={state.trickRoom}
                onCheckedChange={(on) => dispatch({ type: "setTrickRoom", on })}
                aria-label="Trick Room"
              />
            </div>
            {SIDE_IDS.map((side) => (
              <DoublesConditions
                key={side}
                side={side}
                conditions={state.fieldSides[side]}
                format={format}
                dispatch={dispatch}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface FieldPanelProps {
  state: CalcState;
  dispatch: Dispatch<CalcAction>;
}

/** The battle field on phones: weather, terrain and each side's conditions. */
export function FieldPanel({ state, dispatch }: FieldPanelProps) {
  const [format] = useBattleFormat();
  const t = useT();
  const [showRare, setShowRare] = useState(false);
  const titleId = useId();

  return (
    <Panel labelledBy={titleId}>
      <PanelTitle id={titleId}>{t("calc.field")}</PanelTitle>

      <FormatControl className="w-full" />

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">
            {t("calc.weather")}
          </span>
          <WeatherPicker state={state} dispatch={dispatch} />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">
            {t("calc.terrain")}
          </span>
          <TerrainPicker state={state} dispatch={dispatch} />
        </div>
      </div>

      {SIDE_IDS.map((side) => (
        <SideConditions
          key={side}
          side={side}
          conditions={state.fieldSides[side]}
          dispatch={dispatch}
        />
      ))}

      <div className="grid gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {t("calc.doublesOnly")}
        </span>
        {SIDE_IDS.map((side) => (
          <DoublesConditions
            key={side}
            side={side}
            conditions={state.fieldSides[side]}
            format={format}
            dispatch={dispatch}
          />
        ))}
      </div>

      <div className="grid gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="justify-start gap-1.5"
          aria-expanded={showRare}
          onClick={() => setShowRare((open) => !open)}
        >
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform duration-150 ease-out",
              showRare && "rotate-180",
            )}
          />
          {t("calc.moreConditions")}
        </Button>
        {showRare ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Gravity</span>
              <Switch
                checked={state.gravity}
                onCheckedChange={(on) => dispatch({ type: "setGravity", on })}
                aria-label="Gravity"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Trick Room</span>
              <Switch
                checked={state.trickRoom}
                onCheckedChange={(on) => dispatch({ type: "setTrickRoom", on })}
                aria-label="Trick Room"
              />
            </div>
          </>
        ) : null}
      </div>
    </Panel>
  );
}
