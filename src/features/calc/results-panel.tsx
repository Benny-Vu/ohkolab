import { useId, useEffect, type Dispatch } from "react";
import { GaugeIcon } from "lucide-react";
import { TypeBadge } from "@/components/type-badge";
import { Panel, PanelTitle } from "@/features/calc/panel";
import { sideNames } from "@/lib/calc/battle";
import { track } from "@/lib/telemetry/analytics";
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
import type { BattleFormat } from "@/types/battle";

type Names = Record<SideId, string>;
type Selection = { side: SideId; outcome: MoveOutcome };

/** Matchups already reported this session, keyed by format/sides/move. */
const reportedMatchups = new Set<string>();

function MoveRow({
  side,
  outcome,
  selected,
  dispatch,
}: {
  side: SideId;
  outcome: MoveOutcome;
  selected: boolean;
  dispatch: Dispatch<CalcAction>;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => dispatch({ type: "selectMove", side, slot: outcome.slot })}
      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 rounded-lg border px-2 py-1.5 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        selected
          ? "border-primary bg-primary/15"
          : "border-transparent hover:bg-muted/50"
      }`}
    >
      <span className="min-w-0 truncate font-medium">{outcome.move}</span>
      {outcome.type ? <TypeBadge type={outcome.type} /> : null}
      <span className="col-start-1 text-xs tabular-nums text-muted-foreground">
        {outcomeRangeText(outcome)}
      </span>
      <span className="justify-self-end text-xs text-muted-foreground">
        {outcomeSummary(outcome)}
      </span>
    </button>
  );
}

function SelectedResult({
  selection,
  state,
  names,
}: {
  selection: Selection;
  state: CalcState;
  names: Names;
}) {
  const { side, outcome } = selection;
  const result = outcome.result;
  const defender = otherSide(side);
  const hp = result
    ? remainingHp(result, state.sides[defender].hpPercent)
    : null;
  return (
    <div className="grid gap-1.5 rounded-lg border bg-muted/40 p-3 text-sm">
      <p className="font-medium">
        {result?.description || `${names[side]} — ${outcomeSummary(outcome)}`}
        {outcome.crit ? " (critical hit)" : ""}
      </p>
      {result && result.max > 0 && hp ? (
        <>
          <p className="text-muted-foreground">
            Damage:{" "}
            <span className="tabular-nums">
              {result.min}-{result.max} ({result.minPercent} -{" "}
              {result.maxPercent}%)
            </span>
          </p>
          <p className="text-muted-foreground">
            Rolls:{" "}
            {result.rolls ? (
              <span className="tabular-nums">{result.rolls.join(", ")}</span>
            ) : (
              "damage varies per hit"
            )}
          </p>
          <p className="text-muted-foreground">
            Remaining HP:{" "}
            <span className="tabular-nums">
              {hp.minRemaining}-{hp.maxRemaining}
            </span>{" "}
            ({hp.minPercent} - {hp.maxPercent}% of {hp.current} HP)
          </p>
        </>
      ) : null}
    </div>
  );
}

function SpeedSection({ state, names }: { state: CalcState; names: Names }) {
  const speeds: Record<SideId, ReturnType<typeof sideSpeed>> = {
    p1: sideSpeed(state, "p1"),
    p2: sideSpeed(state, "p2"),
  };
  const first = fasterSide({ p1: speeds.p1.final, p2: speeds.p2.final });
  return (
    <div className="grid gap-1 text-sm">
      <h3 className="flex items-center gap-1.5 font-semibold">
        <GaugeIcon className="size-4 text-muted-foreground" aria-hidden />
        Speed
      </h3>
      {SIDE_IDS.map((id) => (
        <p key={id}>
          <span className="font-medium">{names[id]}</span>{" "}
          <span className="tabular-nums">{speeds[id].final}</span>
          {speeds[id].modifiers.length > 0 ? (
            <span className="text-muted-foreground">
              {" "}
              ({speeds[id].modifiers.join(", ")})
            </span>
          ) : null}
        </p>
      ))}
      <p className="font-medium text-primary">
        {first === "tie" ? "Speed tie" : `${names[first]} moves first`}
      </p>
    </div>
  );
}

export function ResultsPanel({
  state,
  outcomes,
  format,
  dispatch,
}: {
  state: CalcState;
  outcomes: Record<SideId, MoveOutcome[]>;
  format: BattleFormat;
  dispatch: Dispatch<CalcAction>;
}) {
  const titleId = useId();
  const names = sideNames(state);
  const selection = resolveSelection(state.selected, outcomes);

  useEffect(() => {
    if (!selection) return;
    const key = `${format}:${names[selection.side]}:${names[otherSide(selection.side)]}:${selection.outcome.move}`;
    if (reportedMatchups.has(key)) return;
    reportedMatchups.add(key);
    track("calc_result_viewed", {
      format,
      attacker: names[selection.side],
      defender: names[otherSide(selection.side)],
      move: selection.outcome.move,
      ko: Boolean(selection.outcome.result?.koText),
    });
  }, [selection, format, names]);

  return (
    <Panel labelledBy={titleId}>
      <PanelTitle id={titleId}>Results</PanelTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {SIDE_IDS.map((side) => {
          const selectedSlot =
            selection && selection.side === side
              ? selection.outcome.slot
              : null;
          const moves = outcomes[side];
          return (
            <div key={side} className="grid content-start gap-1.5">
              <h3 className="text-sm font-semibold">{names[side]}</h3>
              {moves.length === 0 ? (
                <p className="text-xs text-muted-foreground">No moves</p>
              ) : (
                moves.map((outcome) => (
                  <MoveRow
                    key={outcome.slot}
                    side={side}
                    outcome={outcome}
                    selected={selectedSlot === outcome.slot}
                    dispatch={dispatch}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>
      {selection ? (
        <SelectedResult selection={selection} state={state} names={names} />
      ) : null}
      <SpeedSection state={state} names={names} />
    </Panel>
  );
}
