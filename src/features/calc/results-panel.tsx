import { useId, type Dispatch } from "react";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { BigNumber } from "@/components/big-number";
import { DamageMeter } from "@/components/damage-meter";
import { KoLabel } from "@/components/ko-label";
import { TypeBadge } from "@/components/type-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMove } from "@/data";
import { koResultOf } from "@/features/calc/ko-result";
import { Panel, PanelTitle } from "@/features/calc/panel";
import { sideNames } from "@/lib/calc/battle";
import {
  outcomeRangeText,
  outcomeSummary,
  remainingHp,
  resolveSelection,
  type MoveOutcome,
} from "@/lib/calc/results";
import { fasterSide, sideSpeed } from "@/lib/calc/speed";
import {
  SIDE_IDS,
  otherSide,
  type CalcAction,
  type CalcState,
  type SideId,
} from "@/lib/calc/state";
import { track } from "@/lib/telemetry/analytics";
import type { BattleFormat } from "@/types/battle";

const DIRECTION_ARROW = "\u2192";

type Selection = ReturnType<typeof resolveSelection>;

type ResultsPanelProps = {
  state: CalcState;
  outcomes: Record<SideId, MoveOutcome[]>;
  format: BattleFormat;
  dispatch: Dispatch<CalcAction>;
  unframed?: boolean;
};

type DirectionContentProps = {
  side: SideId;
  state: CalcState;
  outcomes: Record<SideId, MoveOutcome[]>;
  selection: Selection;
  names: Record<SideId, string>;
  format: BattleFormat;
  dispatch: Dispatch<CalcAction>;
};

function MoveRow({
  outcome,
  side,
  dispatch,
}: {
  outcome: MoveOutcome;
  side: SideId;
  dispatch: Dispatch<CalcAction>;
}) {
  const summary = outcomeSummary(outcome);
  const ko = koResultOf(summary);

  return (
    <button
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-transparent px-2.5 py-2 text-left transition-colors duration-150 ease-out hover:bg-muted/50"
      onClick={() => dispatch({ type: "selectMove", side, slot: outcome.slot })}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-2">
        {outcome.type ? <TypeBadge size="sm" type={outcome.type} /> : null}
        <span className="min-w-0 font-medium">{outcome.move}</span>
      </span>
      <span className="flex items-center gap-2 justify-self-end">
        <span className="text-xs tabular-nums text-muted-foreground">
          {outcomeRangeText(outcome)}
        </span>
        {ko ? (
          <KoLabel result={ko} />
        ) : (
          <span className="text-xs text-muted-foreground">{summary}</span>
        )}
      </span>
    </button>
  );
}

function SelectedResult({
  state,
  outcome,
  side,
  names,
  format,
}: {
  state: CalcState;
  outcome: MoveOutcome;
  side: SideId;
  names: Record<SideId, string>;
  format: BattleFormat;
}) {
  const result = outcome.result;
  const defender = otherSide(side);
  const move = getMove(outcome.move);
  const summary = outcomeSummary(outcome);
  const ko = koResultOf(summary);
  const hp = result
    ? remainingHp(result, state.sides[defender].hpPercent)
    : null;
  const hasDamage = Boolean(result && result.max > 0);
  const description =
    (result?.description || `${names[side]} \u2014 ${summary}`) +
    (outcome.crit ? " (critical hit)" : "");

  const handleCopy = () => {
    void navigator.clipboard.writeText(description).then(() => {
      toast.success("Copied to clipboard.");
      track("calc_description_copied", { format });
    });
  };

  return (
    <div className="grid gap-3 rounded-lg border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {outcome.type ? <TypeBadge type={outcome.type} /> : null}
        <p className="min-w-0 font-heading text-lg leading-tight font-semibold">
          {outcome.move}
        </p>
        <p className="text-xs text-muted-foreground">
          {outcome.category}
          {outcome.category !== "Status" && move
            ? ` \u00b7 ${move.basePower}`
            : ""}
        </p>
        {ko ? (
          <KoLabel className="ml-auto" result={ko} />
        ) : (
          <span className="ml-auto text-xs text-muted-foreground">
            {summary}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <BigNumber size="2xl">{outcomeRangeText(outcome)}</BigNumber>
        {hasDamage && result ? (
          <DamageMeter
            className="min-w-24 flex-1"
            hpPercent={state.sides[defender].hpPercent}
            maxPercent={result.maxPercent}
            minPercent={result.minPercent}
            size="md"
          />
        ) : null}
      </div>
      {hasDamage && result && hp ? (
        <p className="text-xs tabular-nums text-muted-foreground">
          Damage: {result.min}-{result.max} ({result.minPercent} -{" "}
          {result.maxPercent}%)
        </p>
      ) : null}
      {hasDamage && result && hp ? (
        <p className="text-xs tabular-nums text-muted-foreground">
          Remaining HP: {hp.minRemaining}-{hp.maxRemaining} ({hp.minPercent} -{" "}
          {hp.maxPercent}%)
        </p>
      ) : null}
      {result ? (
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          Rolls:{" "}
          {result.rolls ? result.rolls.join(", ") : "damage varies per hit"}
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-medium">{description}</p>
        <Button
          className="shrink-0"
          onClick={handleCopy}
          size="xs"
          variant="ghost"
        >
          <CopyIcon />
          Copy
        </Button>
      </div>
    </div>
  );
}

function DirectionContent({
  side,
  state,
  outcomes,
  selection,
  names,
  format,
  dispatch,
}: DirectionContentProps) {
  const sideOutcomes = outcomes[side];
  const selectedOutcome = selection?.side === side ? selection.outcome : null;
  const rows = selectedOutcome
    ? sideOutcomes.filter((outcome) => outcome.slot !== selectedOutcome.slot)
    : sideOutcomes;

  return (
    <div className="grid gap-2">
      {selectedOutcome ? (
        <SelectedResult
          format={format}
          names={names}
          outcome={selectedOutcome}
          side={side}
          state={state}
        />
      ) : null}
      {rows.map((outcome) => (
        <MoveRow
          dispatch={dispatch}
          key={outcome.slot}
          outcome={outcome}
          side={side}
        />
      ))}
      {sideOutcomes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No moves</p>
      ) : null}
    </div>
  );
}

function SpeedLine({
  names,
  state,
}: {
  names: Record<SideId, string>;
  state: CalcState;
}) {
  const speeds = { p1: sideSpeed(state, "p1"), p2: sideSpeed(state, "p2") };
  const first = fasterSide(
    { p1: speeds.p1.final, p2: speeds.p2.final },
    state.trickRoom,
  );
  const speedText = (id: SideId) =>
    `${names[id]} ${speeds[id].final}${
      speeds[id].modifiers.length > 0
        ? ` (${speeds[id].modifiers.join(", ")})`
        : ""
    }`;

  return (
    <p className="flex flex-wrap items-baseline gap-x-2 border-t pt-3 text-sm">
      <span className="tabular-nums">
        {speedText("p1")} vs {speedText("p2")}
      </span>
      <span aria-hidden="true" className="text-muted-foreground">
        {"\u00b7"}
      </span>
      <span className="font-medium text-accent-brand-text">
        {first === "tie" ? "Speed tie" : `${names[first]} moves first`}
      </span>
      {state.trickRoom ? (
        <>
          <span aria-hidden="true" className="text-muted-foreground">
            {"\u00b7"}
          </span>
          <span className="text-muted-foreground">Trick Room</span>
        </>
      ) : null}
    </p>
  );
}

export function ResultsPanel({
  state,
  outcomes,
  format,
  dispatch,
  unframed = false,
}: ResultsPanelProps) {
  const titleId = useId();
  const names = sideNames(state);
  const selection = resolveSelection(state.selected, outcomes);

  const content = (
    <div className="grid gap-4">
      <Tabs
        onValueChange={(value) =>
          dispatch({ type: "selectMove", side: value as SideId, slot: 0 })
        }
        value={state.selected.side}
      >
        <TabsList className="w-full" variant="line">
          <TabsTrigger className="text-xs sm:text-sm" value="p1">
            {names.p1} {DIRECTION_ARROW} {names.p2}
          </TabsTrigger>
          <TabsTrigger className="text-xs sm:text-sm" value="p2">
            {names.p2} {DIRECTION_ARROW} {names.p1}
          </TabsTrigger>
        </TabsList>
        {SIDE_IDS.map((side) => (
          <TabsContent key={side} value={side}>
            <DirectionContent
              dispatch={dispatch}
              format={format}
              names={names}
              outcomes={outcomes}
              selection={selection}
              side={side}
              state={state}
            />
          </TabsContent>
        ))}
      </Tabs>
      <SpeedLine names={names} state={state} />
    </div>
  );

  if (unframed) {
    return content;
  }

  return (
    <Panel labelledBy={titleId}>
      <PanelTitle id={titleId}>Results</PanelTitle>
      {content}
    </Panel>
  );
}
