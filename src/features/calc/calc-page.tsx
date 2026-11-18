import { useEffect, useMemo, useState, type Dispatch } from "react";
import { ArrowLeftRightIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

import { BigNumber } from "@/components/big-number";
import { DamageMeter } from "@/components/damage-meter";
import { KoLabel } from "@/components/ko-label";
import { Page } from "@/components/page";
import { PokemonIcon } from "@/components/pokemon-sprite";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FieldBar, FieldPanel } from "@/features/calc/field-panel";
import { koResultOf } from "@/features/calc/ko-result";
import { ResultsPanel } from "@/features/calc/results-panel";
import { SidePanel } from "@/features/calc/side-panel";
import { useCalcState } from "@/features/calc/use-calc-state";
import { useIsWide } from "@/features/calc/use-is-wide";
import { sideNames } from "@/lib/calc/battle";
import {
  computeAllOutcomes,
  outcomeRangeText,
  outcomeSummary,
  resolveSelection,
  type MoveOutcome,
} from "@/lib/calc/results";
import {
  otherSide,
  type CalcAction,
  type CalcState,
  type SideId,
} from "@/lib/calc/state";
import { useBattleFormat } from "@/lib/preferences";
import { track } from "@/lib/telemetry/analytics";
import type { BattleFormat } from "@/types/battle";

const reportedMatchups = new Set<string>();

const SECTION_OPTIONS = [
  { value: "p1", label: "Attacker" },
  { value: "p2", label: "Defender" },
  { value: "field", label: "Field" },
];

type Selection = ReturnType<typeof resolveSelection>;

type StickyResultBarProps = {
  state: CalcState;
  outcomes: Record<SideId, MoveOutcome[]>;
  format: BattleFormat;
  dispatch: Dispatch<CalcAction>;
  selection: Selection;
};

function MatchupChip({ name, species }: { name: string; species: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 rounded-full border bg-card px-3 py-1.5">
      <PokemonIcon className="size-6 shrink-0" species={species} />
      <span className="min-w-0 truncate text-sm font-medium">{name}</span>
    </span>
  );
}

function StickyResultBar({
  state,
  outcomes,
  format,
  dispatch,
  selection,
}: StickyResultBarProps) {
  const result = selection?.outcome.result ?? null;
  const summary = selection ? outcomeSummary(selection.outcome) : null;
  const ko = summary ? koResultOf(summary) : null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="fixed inset-x-0 bottom-14 z-30 grid gap-1.5 border-t bg-background px-4 py-2.5 text-left lg:hidden"
          type="button"
        >
          {selection ? (
            <>
              <span className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 text-sm font-medium">
                    {selection.outcome.move}
                  </span>
                  {ko ? (
                    <KoLabel result={ko} />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {summary}
                    </span>
                  )}
                </span>
                <BigNumber className="shrink-0" size="lg">
                  {outcomeRangeText(selection.outcome)}
                </BigNumber>
              </span>
              {result && result.max > 0 ? (
                <DamageMeter
                  hpPercent={state.sides[otherSide(selection.side)].hpPercent}
                  maxPercent={result.maxPercent}
                  minPercent={result.minPercent}
                  size="sm"
                />
              ) : null}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">No moves yet</span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        aria-describedby={undefined}
        className="max-h-[85vh] overflow-y-auto"
        side="bottom"
      >
        <SheetHeader>
          <SheetTitle>Results</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          <ResultsPanel
            dispatch={dispatch}
            format={format}
            outcomes={outcomes}
            state={state}
            unframed
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function CalcPage() {
  const [state, dispatch] = useCalcState();
  const [format] = useBattleFormat();
  const isWide = useIsWide();
  const [section, setSection] = useState("p1");
  const outcomes = useMemo(
    () => computeAllOutcomes(state, format),
    [state, format],
  );
  const selection = resolveSelection(state.selected, outcomes);
  const names = sideNames(state);

  useEffect(() => {
    if (!selection) {
      return;
    }
    const key = `${format}:${names[selection.side]}:${names[otherSide(selection.side)]}:${selection.outcome.move}`;
    if (reportedMatchups.has(key)) {
      return;
    }
    reportedMatchups.add(key);
    track("calc_result_viewed", {
      format,
      attacker: names[selection.side],
      defender: names[otherSide(selection.side)],
      move: selection.outcome.move,
      ko: Boolean(selection.outcome.result?.koText),
    });
  }, [selection, format, names]);

  const handleReset = () => {
    const previous = state;
    dispatch({ type: "reset" });
    toast("Calculator reset", {
      action: {
        label: "Undo",
        onClick: () => dispatch({ type: "restore", state: previous }),
      },
    });
  };

  if (isWide) {
    return (
      <Page
        actions={
          <>
            <Button
              onClick={() => dispatch({ type: "swapSides" })}
              variant="outline"
            >
              <ArrowLeftRightIcon />
              Swap sides
            </Button>
            <Button onClick={handleReset} variant="outline">
              <RotateCcwIcon />
              Reset
            </Button>
          </>
        }
        title="Damage calculator"
      >
        <div className="grid gap-4">
          <FieldBar dispatch={dispatch} state={state} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,32rem)_minmax(0,1fr)] lg:items-start">
            <SidePanel
              calcSide={state.sides.p1}
              dispatch={dispatch}
              side="p1"
            />
            <div className="lg:sticky lg:top-16 lg:max-h-[calc(100dvh_-_5rem)] lg:overflow-y-auto">
              <ResultsPanel
                dispatch={dispatch}
                format={format}
                outcomes={outcomes}
                state={state}
              />
            </div>
            <SidePanel
              calcSide={state.sides.p2}
              dispatch={dispatch}
              side="p2"
            />
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page
      actions={
        <Button onClick={handleReset} variant="outline">
          <RotateCcwIcon />
          Reset
        </Button>
      }
      title="Damage calculator"
    >
      <div className="grid gap-4 pb-28">
        <div className="flex items-center gap-2">
          <MatchupChip name={names.p1} species={state.sides.p1.set.species} />
          <Button
            aria-label="Swap sides"
            onClick={() => dispatch({ type: "swapSides" })}
            size="icon-sm"
            variant="outline"
          >
            <ArrowLeftRightIcon />
          </Button>
          <MatchupChip name={names.p2} species={state.sides.p2.set.species} />
        </div>
        <SegmentedControl
          aria-label="Calculator section"
          className="w-full"
          onValueChange={setSection}
          options={SECTION_OPTIONS}
          value={section}
        />
        {section === "p1" ? (
          <SidePanel calcSide={state.sides.p1} dispatch={dispatch} side="p1" />
        ) : null}
        {section === "p2" ? (
          <SidePanel calcSide={state.sides.p2} dispatch={dispatch} side="p2" />
        ) : null}
        {section === "field" ? (
          <FieldPanel dispatch={dispatch} state={state} />
        ) : null}
      </div>
      <StickyResultBar
        dispatch={dispatch}
        format={format}
        outcomes={outcomes}
        selection={selection}
        state={state}
      />
    </Page>
  );
}
