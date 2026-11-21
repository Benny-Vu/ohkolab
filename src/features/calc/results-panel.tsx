import { useId, type Dispatch } from "react";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { BigNumber } from "@/components/big-number";
import { DamageMeter } from "@/components/damage-meter";
import { KoLabel } from "@/components/ko-label";
import { TypeBadge } from "@/components/type-badge";
import { Button } from "@/components/ui/button";
import {
  iconHitXsClass,
  linkHitClass,
  rowHitXsClass,
} from "@/components/touch-targets";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMove, useDisplayName } from "@/data";
import { koResultOf, summaryText } from "@/features/calc/ko-result";
import { AssumptionsLine } from "@/features/calc/assumptions";
import { Panel, PanelTitle } from "@/features/calc/panel";
import type { SecondDefenderData } from "@/features/calc/second-defender";
import { useSideNames } from "@/features/calc/use-side-names";
import { SaveImageButton } from "@/features/share/save-image";
import { ShareButton } from "@/features/share/share-button";
import type { ShareCardContent } from "@/lib/share-cards/svg";
import { calcShareUrl } from "@/lib/calc/share-url";
import type { Translate } from "@/components/stat-labels";
import { useT } from "@/lib/i18n/t";
import { useLocale } from "@/lib/i18n/locale";
import type { TranslationKey } from "@/lib/i18n/en";
import { battleName } from "@/lib/calc/battle";
import {
  outcomeRangeText,
  outcomeSummary,
  remainingHp,
  resolveSelection,
  type MoveOutcome,
} from "@/lib/calc/results";
import { fasterSide, sideSpeed, type SpeedModifier } from "@/lib/calc/speed";
import {
  SIDE_IDS,
  otherSide,
  type CalcAction,
  type CalcState,
  type SetOrigin,
  type SideId,
} from "@/lib/calc/state";
import { track } from "@/lib/telemetry/analytics";
import { cn } from "@/lib/utils";
import type { BattleFormat } from "@/types/battle";
import type { MoveCategory } from "@/types/pokemon";

const DIRECTION_ARROW = "→";
/** The damage multiplier a spread move takes in doubles. */
const SPREAD_FACTOR = "0.75";

/** The /learn guide pages behind the results area's labels. */
const LEARN_DAMAGE_ROLLS = "/learn/damage-rolls";
const LEARN_OHKO = "/learn/ohko";
const LEARN_SPEED_TIES = "/learn/speed-ties";

/**
 * A quiet link into the /learn explainers: underlined so it reads as a
 * link, with a 44px hit area on phones (`linkHitClass`).
 */
const learnLinkClass =
  "text-foreground underline decoration-muted-foreground underline-offset-4 hover:decoration-foreground";

/** The move categories shown next to a move's name, as translation keys. */
const CATEGORY_KEYS: Record<MoveCategory, TranslationKey> = {
  Physical: "calc.categoryPhysical",
  Special: "calc.categorySpecial",
  Status: "calc.categoryStatus",
};

/** The localized name of a move category, or null when there is none. */
function categoryLabel(
  category: MoveCategory | null,
  t: Translate,
): string | null {
  return category ? t(CATEGORY_KEYS[category]) : null;
}

type Selection = ReturnType<typeof resolveSelection>;

/** One defender as the result block sees it. */
interface DefenderView {
  /** Localized species name. */
  name: string;
  /** Current HP as a percentage of max HP. */
  hpPercent: number;
}

type ResultsPanelProps = {
  state: CalcState;
  outcomes: Record<SideId, MoveOutcome[]>;
  format: BattleFormat;
  dispatch: Dispatch<CalcAction>;
  unframed?: boolean;
  /** The doubles partner next to the defender, with the attacker's outcomes. */
  second?: SecondDefenderData | null;
};

type DirectionContentProps = {
  side: SideId;
  state: CalcState;
  outcomes: Record<SideId, MoveOutcome[]>;
  selection: Selection;
  names: Record<SideId, string>;
  format: BattleFormat;
  dispatch: Dispatch<CalcAction>;
  second?: SecondDefenderData | null;
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
  const t = useT();
  const displayName = useDisplayName();
  const summary = outcomeSummary(outcome);
  const ko = koResultOf(summary);

  return (
    <button
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-transparent px-2 py-2 text-left transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:bg-surface-sunken"
      onClick={() => dispatch({ type: "selectMove", side, slot: outcome.slot })}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-2">
        {outcome.type ? <TypeBadge size="sm" type={outcome.type} /> : null}
        <span className="min-w-0 font-medium">
          {displayName("move", outcome.move)}
        </span>
      </span>
      <span className="flex items-center gap-2 justify-self-end">
        <span className="text-xs tabular-nums text-muted-foreground">
          {outcomeRangeText(outcome)}
        </span>
        {ko ? (
          <KoLabel result={ko} />
        ) : (
          <span className="text-xs text-muted-foreground">
            {summaryText(summary, t)}
          </span>
        )}
      </span>
    </button>
  );
}

type ResultBlockProps = {
  attackerName: string;
  defender: DefenderView;
  outcome: MoveOutcome;
  state: CalcState;
  format: BattleFormat;
  /** True when a second defender's block sits next to this one. */
  hasPartner: boolean;
  /** The shareable calculator URL for the current state. */
  shareUrl: string;
  /** Where the defender's set came from; shown in the assumptions line. */
  origin: SetOrigin;
};

/**
 * The full result of the selected move into one defender: damage, KO chance,
 * rolls and the description. In doubles with a second defender, two of these
 * sit side by side, one per defender.
 */
function ResultBlock({
  attackerName,
  defender,
  outcome,
  state,
  format,
  hasPartner,
  shareUrl,
  origin,
}: ResultBlockProps) {
  const t = useT();
  const [locale] = useLocale();
  const displayName = useDisplayName();
  const result = outcome.result;
  const move = getMove(outcome.move);
  const summary = outcomeSummary(outcome);
  const ko = koResultOf(summary);
  const hp = result ? remainingHp(result, defender.hpPercent) : null;
  const hasDamage = Boolean(result && result.max > 0);
  const description =
    (result?.description || `${attackerName} — ${summaryText(summary, t)}`) +
    (outcome.crit ? t("calc.criticalHit") : "");
  // A spread move hits both defenders at once, but takes the 0.75 cut in
  // doubles; a single-target move hits only one of them per use.
  const isSpread = format === "doubles" && (move?.isSpread ?? false);
  const targetsOne =
    hasPartner &&
    format === "doubles" &&
    !isSpread &&
    outcome.kind !== "status";

  const handleCopy = () => {
    void navigator.clipboard.writeText(description).then(() => {
      toast.success(t("calc.copied"));
      track("calc_description_copied", { format });
    });
  };

  const cardContent: ShareCardContent = {
    kind: "calc",
    eyebrow: t("calc.title"),
    heading: t("postCard.vs", { a: attackerName, b: defender.name }),
    body: displayName("move", outcome.move),
    stat: outcomeRangeText(outcome),
    species: [],
  };

  return (
    <div className="grid gap-3 rounded-lg border bg-surface-sunken p-3">
      {hasPartner ? (
        <p className="text-xs font-medium text-muted-foreground">
          {defender.name}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {outcome.type ? <TypeBadge type={outcome.type} /> : null}
        <p className="min-w-0 font-heading text-lg leading-tight font-semibold">
          {displayName("move", outcome.move)}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {categoryLabel(outcome.category, t)}
          {outcome.category !== "Status" && move ? ` · ${move.basePower}` : ""}
        </p>
        {hasDamage && isSpread ? (
          <span className="rounded-full border bg-card px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {t("calc.spreadMove", { factor: SPREAD_FACTOR })}
          </span>
        ) : null}
        {ko ? (
          <a
            className={cn("ml-auto", linkHitClass, learnLinkClass)}
            href={LEARN_OHKO}
          >
            <KoLabel result={ko} />
          </a>
        ) : (
          <span className="ml-auto text-xs text-muted-foreground">
            {summaryText(summary, t)}
          </span>
        )}
      </div>
      {targetsOne ? (
        <p className="text-xs text-muted-foreground">
          {t("calc.singleTarget")}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        {/* Keyed by the range so each new result rises the number in:
            opacity stays 1, only a small translate plays, so fast
            recalculations never blink. */}
        <BigNumber
          key={outcomeRangeText(outcome)}
          className="animate-in slide-in-from-bottom-1 duration-(--motion-fast) ease-(--motion-ease-out)"
          size="2xl"
        >
          {outcomeRangeText(outcome)}
        </BigNumber>
        {hasDamage && result ? (
          <DamageMeter
            className="min-w-24 flex-1"
            hpPercent={defender.hpPercent}
            maxPercent={result.maxPercent}
            minPercent={result.minPercent}
            size="md"
          />
        ) : null}
      </div>
      {hasDamage && result?.koText ? (
        <p className="text-sm font-medium text-accent-brand-text">
          {result.koText}
        </p>
      ) : null}
      {hasDamage && result && hp ? (
        <p className="text-xs tabular-nums text-muted-foreground">
          <a
            className={cn(linkHitClass, learnLinkClass)}
            href={LEARN_DAMAGE_ROLLS}
          >
            {t("calc.damageLine", {
              min: result.min,
              max: result.max,
              minPercent: result.minPercent,
              maxPercent: result.maxPercent,
            })}
          </a>
        </p>
      ) : null}
      {hasDamage && result && hp ? (
        <p className="text-xs tabular-nums text-muted-foreground">
          {t("calc.remainingHpLine", {
            min: hp.minRemaining,
            max: hp.maxRemaining,
            minPercent: hp.minPercent,
            maxPercent: hp.maxPercent,
          })}
        </p>
      ) : null}
      {result ? (
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {t("calc.rolls", {
            rolls: result.rolls
              ? result.rolls.join(", ")
              : t("calc.damageVaries"),
          })}
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        {/* @smogon/calc's sentence is English only. In Japanese the line
            shows the translated summary (the numbers are already above);
            Copy still copies the standard English sentence players share. */}
        <p className="min-w-0 text-sm font-medium">
          {locale === "ja"
            ? `${attackerName} — ${summaryText(summary, t)}${outcome.crit ? t("calc.criticalHit") : ""}`
            : description}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <ShareButton
            title={`${t("calc.title")} · ${displayName("move", outcome.move)}`}
            url={shareUrl}
            size="xs"
            variant="ghost"
            className={rowHitXsClass}
          />
          <SaveImageButton
            content={cardContent}
            iconOnly
            size="xs"
            variant="ghost"
            className={iconHitXsClass}
          />
          <Button
            onClick={handleCopy}
            size="xs"
            variant="ghost"
            className={rowHitXsClass}
          >
            <CopyIcon />
            {t("calc.copy")}
          </Button>
        </div>
      </div>
      <AssumptionsLine origin={origin} state={state} />
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
  second,
}: DirectionContentProps) {
  const t = useT();
  const displayName = useDisplayName();
  const sideOutcomes = outcomes[side];
  const selectedOutcome = selection?.side === side ? selection.outcome : null;
  const rows = selectedOutcome
    ? sideOutcomes.filter((outcome) => outcome.slot !== selectedOutcome.slot)
    : sideOutcomes;
  // The second defender stands on the defender's side of the field, so only
  // the p1 direction can hit it, and only in doubles.
  const secondOutcome =
    second && selectedOutcome && side === "p1" && format === "doubles"
      ? (second.outcomes.find(
          (outcome) => outcome.slot === selectedOutcome.slot,
        ) ?? null)
      : null;
  const showSecond = secondOutcome !== null;
  const shareUrl = calcShareUrl(state, format);

  return (
    <div className="grid gap-2">
      {selectedOutcome ? (
        <div className="grid gap-3">
          <ResultBlock
            attackerName={names[side]}
            defender={{
              name: names[otherSide(side)],
              hpPercent: state.sides[otherSide(side)].hpPercent,
            }}
            format={format}
            hasPartner={showSecond}
            outcome={selectedOutcome}
            origin={state.origins[otherSide(side)]}
            shareUrl={shareUrl}
            state={state}
          />
          {showSecond && second && secondOutcome ? (
            <ResultBlock
              attackerName={names[side]}
              defender={{
                name: displayName("species", battleName(second.side)),
                hpPercent: second.side.hpPercent,
              }}
              format={format}
              hasPartner
              outcome={secondOutcome}
              // The second defender is always a hand-built copy.
              origin={{ kind: "custom" }}
              shareUrl={shareUrl}
              state={state}
            />
          ) : null}
        </div>
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
        <p className="text-sm text-muted-foreground">{t("calc.noMoves")}</p>
      ) : null}
    </div>
  );
}

/** One Speed modifier in words: a stage as "+1", the rest localized. */
function modifierText(
  modifier: SpeedModifier,
  t: Translate,
  display: ReturnType<typeof useDisplayName>,
): string {
  switch (modifier.kind) {
    case "stage":
      return modifier.stage > 0 ? `+${modifier.stage}` : `${modifier.stage}`;
    case "tailwind":
      return t("calc.speedTailwind");
    case "ability":
      return display("ability", modifier.ability);
    case "item":
      return display("item", modifier.item);
    case "paralysis":
      return t("calc.speedParalysis");
  }
}

function SpeedLine({
  names,
  state,
}: {
  names: Record<SideId, string>;
  state: CalcState;
}) {
  const t = useT();
  const display = useDisplayName();
  const speeds = { p1: sideSpeed(state, "p1"), p2: sideSpeed(state, "p2") };
  const first = fasterSide(
    { p1: speeds.p1.final, p2: speeds.p2.final },
    state.trickRoom,
  );
  const speedText = (id: SideId) =>
    `${names[id]} ${speeds[id].final}${
      speeds[id].modifiers.length > 0
        ? ` (${speeds[id].modifiers
            .map((modifier) => modifierText(modifier, t, display))
            .join(", ")})`
        : ""
    }`;

  return (
    <p className="flex flex-wrap items-baseline gap-x-2 border-t pt-3 text-sm">
      <span className="tabular-nums">
        {speedText("p1")} vs {speedText("p2")}
      </span>
      <span aria-hidden="true" className="text-muted-foreground">
        {"·"}
      </span>
      <span className="font-medium text-accent-brand-text">
        {first === "tie" ? (
          <a
            className={cn(linkHitClass, learnLinkClass)}
            href={LEARN_SPEED_TIES}
          >
            {t("calc.speedTie")}
          </a>
        ) : (
          t("calc.movesFirst", { name: names[first] })
        )}
      </span>
      {state.trickRoom ? (
        <>
          <span aria-hidden="true" className="text-muted-foreground">
            {"·"}
          </span>
          <span className="text-muted-foreground">{t("calc.trickRoom")}</span>
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
  second = null,
  unframed = false,
}: ResultsPanelProps) {
  const titleId = useId();
  const t = useT();
  const names = useSideNames(state);
  const selection = resolveSelection(state.selected, outcomes);

  const content = (
    <div className="grid gap-4">
      <Tabs
        onValueChange={(value) =>
          dispatch({ type: "selectMove", side: value as SideId, slot: 0 })
        }
        value={state.selected.side}
      >
        <TabsList className="w-full max-sm:h-14" variant="line">
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
              second={second}
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
      <PanelTitle id={titleId}>{t("calc.results")}</PanelTitle>
      {content}
    </Panel>
  );
}
