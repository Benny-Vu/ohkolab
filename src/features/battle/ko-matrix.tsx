import { useId, useState } from "react";

import { DamageMeter } from "@/components/damage-meter";
import { EmptyState } from "@/components/empty-state";
import { KoLabel } from "@/components/ko-label";
import { PokemonIcon } from "@/components/pokemon-sprite";
import { TypeBadge } from "@/components/type-badge";
import { LoadingArea } from "@/components/skeletons/loading-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Panel, PanelTitle } from "@/features/calc/panel";
import { useDisplayName } from "@/data/display-names";
import { useT } from "@/lib/i18n/t";
import type { PokemonSet } from "@/types/pokemon";
import type { OpponentInput } from "@/features/battle/opponent-input";
import {
  matrixRangeText,
  type BattleMatrix,
  type MatrixCell,
  type MatrixMove,
} from "@/features/battle/matrix";

/**
 * The KO matrix, both directions: your best move into each of theirs and
 * their best move into each of yours. Each cell is the best move's damage
 * range plus its KO label; tapping a cell opens the pair's full calc in a
 * sheet.
 */

/** One direction of the matrix. */
type Direction = "mine" | "theirs";

interface SelectedPair {
  direction: Direction;
  attacker: number;
  defender: number;
}

interface KoMatrixProps {
  matrix: BattleMatrix | null;
  isPending: boolean;
  mySets: PokemonSet[];
  opponents: OpponentInput[];
}

export function KoMatrix({
  matrix,
  isPending,
  mySets,
  opponents,
}: KoMatrixProps) {
  const t = useT();
  const displayName = useDisplayName();
  const [pair, setPair] = useState<SelectedPair | null>(null);

  const directions: {
    direction: Direction;
    heading: string;
    cells: MatrixCell[][] | undefined;
    attackers: (PokemonSet | OpponentInput)[];
    defenders: (PokemonSet | OpponentInput)[];
  }[] = [
    {
      direction: "mine",
      heading: t("battle.matrixMine"),
      cells: matrix?.mine,
      attackers: mySets,
      defenders: opponents,
    },
    {
      direction: "theirs",
      heading: t("battle.matrixTheirs"),
      cells: matrix?.theirs,
      attackers: opponents,
      defenders: mySets,
    },
  ];

  const selectedCell = (() => {
    if (!pair) return null;
    const grid = pair.direction === "mine" ? matrix?.mine : matrix?.theirs;
    return grid?.[pair.attacker]?.[pair.defender] ?? null;
  })();

  const attackerMember = pair
    ? ((pair.direction === "mine"
        ? mySets[pair.attacker]
        : opponents[pair.attacker]) ?? null)
    : null;
  const defenderMember = pair
    ? ((pair.direction === "mine"
        ? opponents[pair.defender]
        : mySets[pair.defender]) ?? null)
    : null;
  const pairTitle =
    attackerMember && defenderMember
      ? `${displayName("species", memberName(attackerMember))} ${DIRECTION_ARROW} ${displayName("species", memberName(defenderMember))}`
      : "";

  return (
    <div className="grid gap-4">
      {directions.map(({ direction, heading, cells, attackers, defenders }) =>
        cells ? (
          <MatrixTable
            key={direction}
            heading={heading}
            cells={cells}
            attackers={attackers}
            defenders={defenders}
            onSelect={(attacker, defender) =>
              setPair({ direction, attacker, defender })
            }
          />
        ) : isPending ? (
          <LoadingArea
            key={direction}
            pending={true}
            label={t("battle.matrixLoading")}
            skeleton={<MatrixSkeleton />}
          >
            {null}
          </LoadingArea>
        ) : (
          <EmptyState key={direction} title={t("battle.emptyMatrix")} />
        ),
      )}

      <Sheet
        open={pair !== null}
        onOpenChange={(open) => {
          if (!open) setPair(null);
        }}
      >
        <SheetContent
          aria-describedby={undefined}
          className="max-h-[85vh] overflow-y-auto"
          side="bottom"
        >
          <SheetHeader>
            <SheetTitle>{pairTitle}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-1.5 px-4 pb-4">
            {selectedCell && selectedCell.moves.length > 0 ? (
              selectedCell.moves.map((move) => (
                <MoveRow key={move.move} move={move} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("battle.noDamagingMoves")}
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** The name a row or column header shows: nickname or species. */
function memberName(member: PokemonSet | OpponentInput): string {
  const set = "set" in member ? member.set : member;
  return set.nickname?.trim() || set.species;
}

interface MatrixTableProps {
  heading: string;
  cells: MatrixCell[][];
  attackers: (PokemonSet | OpponentInput)[];
  defenders: (PokemonSet | OpponentInput)[];
  onSelect: (attacker: number, defender: number) => void;
}

/**
 * One direction's grid. It scrolls inside its own box with sticky row and
 * column headers, so the phone can pan through a 6×6 without losing the axes.
 */
function MatrixTable({
  heading,
  cells,
  attackers,
  defenders,
  onSelect,
}: MatrixTableProps) {
  const t = useT();
  const displayName = useDisplayName();
  const titleId = useId();

  return (
    <Panel labelledBy={titleId}>
      <PanelTitle id={titleId}>{heading}</PanelTitle>
      <div
        className="max-h-[26rem] overflow-auto rounded-md border bg-card"
        role="region"
        aria-label={heading}
      >
        <table
          className="w-full min-w-max border-collapse"
          aria-label={heading}
        >
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky top-0 left-0 z-30 min-w-20 bg-card p-1"
              >
                <span className="sr-only">{t("battle.matrixAria")}</span>
              </th>
              {defenders.map((defender, index) => {
                const species = memberName(defender);
                return (
                  <th
                    key={index}
                    scope="col"
                    className="sticky top-0 z-20 min-w-16 border-b border-border bg-card p-1"
                  >
                    <span className="flex flex-col items-center gap-0.5">
                      <PokemonIcon species={species} className="size-6" />
                      <span className="max-w-16 truncate text-2xs font-medium">
                        {displayName("species", species)}
                      </span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {attackers.map((attacker, i) => {
              const species = memberName(attacker);
              return (
                <tr key={i}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 min-w-20 border-r border-border bg-card p-1"
                  >
                    <span className="flex items-center gap-1">
                      <PokemonIcon
                        species={species}
                        className="size-6 shrink-0"
                      />
                      <span className="max-w-24 truncate text-xs font-medium">
                        {displayName("species", species)}
                      </span>
                    </span>
                  </th>
                  {defenders.map((defender, j) => {
                    const cell = cells[i]?.[j];
                    const best = cell?.best ?? null;
                    const defenderSpecies = memberName(defender);
                    const range = best ? matrixRangeText(best) : "–";
                    const koSummary = best?.koText || "";
                    return (
                      <td key={j} className="border-b border-border/50 p-0.5">
                        <button
                          type="button"
                          className="flex min-h-11 w-full min-w-16 flex-col items-center justify-center gap-0.5 rounded-md px-1 transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:bg-accent-brand-subtle focus-visible:bg-accent-brand-subtle focus-visible:outline-2 focus-visible:outline-accent-brand-text"
                          aria-label={
                            best
                              ? `${displayName("species", species)} ${best.move} vs ${displayName("species", defenderSpecies)}: ${range}${koSummary ? `, ${koSummary}` : ""}`
                              : `${displayName("species", species)} vs ${displayName("species", defenderSpecies)}: ${t("battle.noDamagingMoves")}`
                          }
                          onClick={() => onSelect(i, j)}
                        >
                          {best ? (
                            <>
                              <span className="font-mono text-2xs tabular-nums">
                                {range}
                              </span>
                              {best.ko ? <KoLabel result={best.ko} /> : null}
                            </>
                          ) : (
                            <span aria-hidden className="text-muted-foreground">
                              –
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/** The skeleton of one matrix, in the shape of the real grid. */
function MatrixSkeleton() {
  return (
    <div aria-hidden className="grid gap-1 rounded-md border bg-card p-2">
      {Array.from({ length: 3 }, (_, row) => (
        <div key={row} className="grid grid-cols-4 gap-1">
          {Array.from({ length: 4 }, (_, column) => (
            <Skeleton key={column} className="h-11" />
          ))}
        </div>
      ))}
    </div>
  );
}

const DIRECTION_ARROW = "→";

/** One move of the pair sheet: name, type, range, KO label and description. */
function MoveRow({ move }: { move: MatrixMove }) {
  const t = useT();
  const displayName = useDisplayName();
  const range = matrixRangeText(move);
  const summary = moveSummary(move, t);

  return (
    <div className="grid gap-1 rounded-md border bg-card p-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate text-sm font-medium">
            {displayName("move", move.move)}
          </span>
          {move.type ? <TypeBadge type={move.type} className="px-1" /> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="font-mono text-xs tabular-nums">{range}</span>
          {move.ko ? <KoLabel result={move.ko} /> : null}
        </span>
      </div>
      {move.kind === "damage" ? (
        <>
          <DamageMeter
            hpPercent={100}
            maxPercent={move.maxPercent ?? 0}
            minPercent={move.minPercent ?? 0}
            size="sm"
          />
          {move.description ? (
            <p className="font-mono text-2xs break-words text-muted-foreground">
              {move.description}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{summary}</p>
      )}
      {move.kind === "damage" && move.koText ? (
        <p className="text-xs text-muted-foreground">{move.koText}</p>
      ) : null}
    </div>
  );
}

/** The short reason a non-damage move has no range. */
function moveSummary(move: MatrixMove, t: ReturnType<typeof useT>): string {
  switch (move.kind) {
    case "none":
      return t("calc.summaryNoEffect");
    case "status":
      return t("calc.summaryStatusMove");
    case "error":
      return t("calc.summaryCannotCalc");
    case "damage":
      return move.koText || t("calc.summaryNotAKo");
  }
}
