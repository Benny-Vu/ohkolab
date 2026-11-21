import { useEffect, useMemo, useState, type Dispatch } from "react";
import { ArrowLeftRightIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

import { BigNumber } from "@/components/big-number";
import { BattleModeLink, NotesLink } from "@/features/battle/battle-link";
import { DamageMeter } from "@/components/damage-meter";
import { DataBadge } from "@/components/data-badge";
import { KoLabel } from "@/components/ko-label";
import { Page } from "@/components/page";
import { PokemonIcon } from "@/components/pokemon-sprite";
import { SegmentedControl } from "@/components/segmented-control";
import { useDisplayName } from "@/data/display-names";
import { Button } from "@/components/ui/button";
import { buttonTouchClass, iconHitSmClass } from "@/components/touch-targets";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FieldBar, FieldPanel } from "@/features/calc/field-panel";
import { koResultOf, summaryText } from "@/features/calc/ko-result";
import { KnownLimitations } from "@/features/calc/known-limitations";
import { ResultsPanel } from "@/features/calc/results-panel";
import { SecondDefenderPanel } from "@/features/calc/second-defender-panel";
import {
  computeSecondOutcomes,
  type SecondDefenderData,
} from "@/features/calc/second-defender";
import { SidePanel } from "@/features/calc/side-panel";
import { useCalcState } from "@/features/calc/use-calc-state";
import { useIsWide } from "@/features/calc/use-is-wide";
import { useSideNames } from "@/features/calc/use-side-names";
import { useLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";
import { sideNames } from "@/lib/calc/battle";
import {
  computeAllOutcomes,
  outcomeRangeText,
  outcomeSummary,
  resolveSelection,
  type MoveOutcome,
} from "@/lib/calc/results";
import {
  createSide,
  otherSide,
  type CalcAction,
  type CalcSide,
  type CalcState,
  type SideId,
} from "@/lib/calc/state";
import { useBattleFormat } from "@/lib/preferences";
import { track } from "@/lib/telemetry/analytics";
import type { BattleFormat } from "@/types/battle";

const reportedMatchups = new Set<string>();

type Selection = ReturnType<typeof resolveSelection>;

type StickyResultBarProps = {
  state: CalcState;
  outcomes: Record<SideId, MoveOutcome[]>;
  format: BattleFormat;
  dispatch: Dispatch<CalcAction>;
  selection: Selection;
  second: SecondDefenderData | null;
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
  second,
}: StickyResultBarProps) {
  const t = useT();
  const [locale] = useLocale();
  const displayName = useDisplayName();
  const result = selection?.outcome.result ?? null;
  const summary = selection ? outcomeSummary(selection.outcome) : null;
  const ko = summary ? koResultOf(summary) : null;
  // English shortens "GUARANTEED 2HKO" to fit the phone bar. Japanese must
  // not: its "2HKO" label is 乱数2発 (possible), while 確定2発 is short anyway.
  const shortKo = locale === "en" && ko === "GUARANTEED 2HKO" ? "2HKO" : ko;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="fixed inset-x-0 bottom-14 z-30 grid gap-1.5 border-t bg-background px-4 py-2 text-left lg:hidden"
          type="button"
        >
          {selection ? (
            <>
              <span className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {displayName("move", selection.outcome.move)}
                  </span>
                  {shortKo ? (
                    <KoLabel className="shrink-0" result={shortKo} />
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {summary !== null ? summaryText(summary, t) : null}
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
            <span className="text-sm text-muted-foreground">
              {t("calc.noMovesYet")}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        aria-describedby={undefined}
        className="max-h-[85vh] overflow-y-auto"
        side="bottom"
      >
        <SheetHeader>
          <SheetTitle>{t("calc.results")}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          <ResultsPanel
            dispatch={dispatch}
            format={format}
            outcomes={outcomes}
            second={second}
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
  const t = useT();
  const isWide = useIsWide();
  const [section, setSection] = useState("p1");
  // The defender's partner in doubles. Page-local: optional, removable and
  // not part of the shared calculator state.
  const [secondSide, setSecondSide] = useState<CalcSide | null>(null);
  const sectionOptions = [
    { value: "p1", label: t("calc.attacker") },
    { value: "p2", label: t("calc.defender") },
    { value: "field", label: t("calc.field") },
  ];
  const outcomes = useMemo(
    () => computeAllOutcomes(state, format),
    [state, format],
  );
  const second: SecondDefenderData | null = useMemo(
    () =>
      secondSide
        ? {
            side: secondSide,
            outcomes: computeSecondOutcomes(state, format, secondSide),
          }
        : null,
    [state, format, secondSide],
  );
  const selection = resolveSelection(state.selected, outcomes);
  const names = sideNames(state);
  const displayNames = useSideNames(state);

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
    toast(t("calc.resetToast"), {
      action: {
        label: t("calc.undo"),
        onClick: () => dispatch({ type: "restore", state: previous }),
      },
    });
  };

  // The second defender starts as a copy of the defender: the partner to
  // edit from, and only in doubles where two Pokémon share the field.
  const handleAddSecondDefender = () => {
    if (secondSide) return;
    setSecondSide(createSide(state.sides.p2.set));
  };

  const secondDefenderSection =
    format === "doubles" ? (
      secondSide ? (
        <SecondDefenderPanel
          onChange={setSecondSide}
          onRemove={() => setSecondSide(null)}
          value={secondSide}
        />
      ) : (
        <Button
          className={`md:justify-start ${buttonTouchClass}`}
          onClick={handleAddSecondDefender}
          variant="outline"
        >
          <PlusIcon aria-hidden />
          {t("calc.addSecondDefender")}
        </Button>
      )
    ) : null;

  if (isWide) {
    return (
      <Page
        actions={
          <>
            <DataBadge />
            <BattleModeLink />
            <NotesLink />
            <Button
              onClick={() => dispatch({ type: "swapSides" })}
              variant="outline"
            >
              <ArrowLeftRightIcon aria-hidden />
              {t("calc.swapSides")}
            </Button>
            <Button onClick={handleReset} variant="outline">
              <RotateCcwIcon aria-hidden />
              {t("calc.reset")}
            </Button>
          </>
        }
        title={t("calc.title")}
      >
        <div className="grid gap-4">
          <FieldBar dispatch={dispatch} state={state} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,32rem)_minmax(0,1fr)] lg:items-start">
            <SidePanel
              calcSide={state.sides.p1}
              dispatch={dispatch}
              origin={state.origins.p1}
              side="p1"
            />
            <div className="lg:sticky lg:top-16 lg:max-h-[calc(100dvh_-_5rem)] lg:overflow-y-auto">
              <ResultsPanel
                dispatch={dispatch}
                format={format}
                outcomes={outcomes}
                second={second}
                state={state}
              />
            </div>
            <div className="grid gap-4">
              <SidePanel
                calcSide={state.sides.p2}
                dispatch={dispatch}
                origin={state.origins.p2}
                side="p2"
              />
              {secondDefenderSection}
            </div>
          </div>
          <KnownLimitations />
        </div>
      </Page>
    );
  }

  return (
    <Page
      actions={
        <>
          <DataBadge />
          <BattleModeLink />
          <NotesLink />
          <Button
            onClick={handleReset}
            variant="outline"
            className={buttonTouchClass}
          >
            <RotateCcwIcon aria-hidden />
            {t("calc.reset")}
          </Button>
        </>
      }
      title={t("calc.title")}
    >
      <div className="grid gap-4 pb-28">
        <div className="flex items-center gap-2">
          <MatchupChip
            name={displayNames.p1}
            species={state.sides.p1.set.species}
          />
          <Button
            aria-label={t("calc.swapSides")}
            onClick={() => dispatch({ type: "swapSides" })}
            size="icon-sm"
            variant="outline"
            className={iconHitSmClass}
          >
            <ArrowLeftRightIcon aria-hidden />
          </Button>
          <MatchupChip
            name={displayNames.p2}
            species={state.sides.p2.set.species}
          />
        </div>
        <SegmentedControl
          aria-label={t("calc.sectionAria")}
          className="w-full"
          onValueChange={setSection}
          options={sectionOptions}
          value={section}
        />
        {section === "p1" ? (
          <SidePanel
            calcSide={state.sides.p1}
            dispatch={dispatch}
            origin={state.origins.p1}
            side="p1"
          />
        ) : null}
        {section === "p2" ? (
          <div className="grid gap-4">
            <SidePanel
              calcSide={state.sides.p2}
              dispatch={dispatch}
              origin={state.origins.p2}
              side="p2"
            />
            {secondDefenderSection}
          </div>
        ) : null}
        {section === "field" ? (
          <FieldPanel dispatch={dispatch} state={state} />
        ) : null}
        <KnownLimitations />
      </div>
      <StickyResultBar
        dispatch={dispatch}
        format={format}
        outcomes={outcomes}
        second={second}
        selection={selection}
        state={state}
      />
    </Page>
  );
}
