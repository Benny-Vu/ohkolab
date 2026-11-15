import { XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Combobox,
  OptionList,
  type OptionGroup,
} from "@/components/pokemon-editor/combobox";
import { TypeBadge } from "@/components/type-badge";
import { Button } from "@/components/ui/button";
import {
  getLearnableMoves,
  getMove,
  getSpecies,
  listMoves,
  type MoveInfo,
} from "@/data";
import { cn } from "@/lib/utils";
import type { MoveCategory } from "@/types/pokemon";

export interface MovePickerProps {
  /** Chosen move name, or null for an empty slot. */
  value: string | null;
  onChange: (move: string | null) => void;
  /** The user of the move. Its learnable moves are listed first. */
  species?: string;
  /** Moves not to offer, typically the ones in the other slots. Nulls are ignored. */
  exclude?: readonly (string | null)[];
  /** Accessible name of the control and its placeholder. Default "Move". */
  label?: string;
  placeholder?: string;
  /** Show a button that empties the slot. Default true. */
  clearable?: boolean;
  className?: string;
  /** Id of the control, for a `<label htmlFor>`. */
  id?: string;
}

const CATEGORY_SHORT: Record<MoveCategory, string> = {
  Physical: "Phys",
  Special: "Spec",
  Status: "Status",
};

const NO_MOVES: readonly string[] = [];

/**
 * The Champions moves a species can learn. Null while they load; an empty
 * list when there is no species or the learnset is unavailable.
 */
function useLearnableMoves(species: string | undefined) {
  const [loaded, setLoaded] = useState<{
    species: string;
    moves: readonly string[];
  } | null>(null);

  useEffect(() => {
    if (!species) return;
    let cancelled = false;
    getLearnableMoves(species).then(
      (moves) => {
        if (!cancelled) setLoaded({ species, moves });
      },
      () => {
        if (!cancelled) setLoaded({ species, moves: NO_MOVES });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [species]);

  if (!species) return NO_MOVES;
  return loaded?.species === species ? loaded.moves : null;
}

const getName = (move: MoveInfo) => move.name;
const getKeywords = (move: MoveInfo) => [move.type, move.category];

function renderMove(move: MoveInfo) {
  return (
    <>
      <TypeBadge
        type={move.type}
        className="w-15 min-w-0 shrink-0 px-0 text-[10px]"
      />
      <span className="min-w-0 flex-1 truncate">{move.name}</span>
      <span className="w-10 shrink-0 text-xs text-muted-foreground">
        <span aria-hidden>{CATEGORY_SHORT[move.category]}</span>
        <span className="sr-only">{move.category}</span>
      </span>
      <span className="w-7 shrink-0 text-right text-xs tabular-nums">
        <span className="sr-only">Power </span>
        {move.basePower > 0 ? move.basePower : "—"}
      </span>
      <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
        <span className="sr-only">Accuracy </span>
        {move.accuracy === null ? "—" : `${move.accuracy}%`}
      </span>
    </>
  );
}

const columnTitles = (
  <div
    aria-hidden
    className="flex items-center gap-2 px-3 pt-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
  >
    <span className="flex-1">Move</span>
    <span className="w-10">Cat.</span>
    <span className="w-7 text-right">Pow.</span>
    <span className="w-9 text-right">Acc.</span>
    <span className="w-4" />
  </div>
);

function MoveOptions({
  selected,
  species,
  exclude,
  onSelect,
}: {
  selected: string | null;
  species: string | undefined;
  exclude: readonly (string | null)[];
  onSelect: (move: string) => void;
}) {
  const learnable = useLearnableMoves(species);
  const speciesName = species
    ? (getSpecies(species)?.name ?? species)
    : undefined;
  // A stable key, so the groups are not rebuilt when the parent passes a new array.
  const excludeKey = exclude
    .filter((move) => move !== null && move !== selected)
    .join("\n");

  const groups = useMemo<OptionGroup<MoveInfo>[]>(() => {
    const excluded = new Set(excludeKey === "" ? [] : excludeKey.split("\n"));
    const offered = listMoves().filter((move) => !excluded.has(move.name));
    if (learnable === null) {
      return [{ heading: "All moves (loading learnset…)", options: offered }];
    }
    if (learnable.length === 0) {
      return [{ heading: "All moves", options: offered }];
    }
    const known = new Set(learnable);
    return [
      {
        heading: `Learned by ${speciesName}`,
        options: offered.filter((move) => known.has(move.name)),
      },
      {
        heading: "Other moves",
        options: offered.filter((move) => !known.has(move.name)),
      },
    ];
  }, [excludeKey, learnable, speciesName]);

  return (
    <OptionList
      label="Search moves"
      placeholder="Search moves or type…"
      groups={groups}
      getName={getName}
      getKeywords={getKeywords}
      renderOption={renderMove}
      selected={selected}
      onSelect={onSelect}
      emptyText="No move found."
      header={columnTitles}
    />
  );
}

/**
 * Picks one move. Moves the species can learn come first under their own
 * heading, then every other Champions move.
 */
export function MovePicker({
  value,
  onChange,
  species,
  exclude = NO_MOVES,
  label = "Move",
  placeholder,
  clearable = true,
  className,
  id,
}: MovePickerProps) {
  const known = value ? getMove(value) : undefined;

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <Combobox
        id={id}
        label={label}
        onIntent={() => {
          // Warm the learnset cache so the list opens already grouped.
          if (species) void getLearnableMoves(species).catch(() => undefined);
        }}
        content={(close) => (
          <MoveOptions
            selected={known?.name ?? value}
            species={species}
            exclude={exclude}
            onSelect={(move) => {
              close();
              onChange(move);
            }}
          />
        )}
      >
        {value ? (
          <>
            {known ? (
              <TypeBadge
                type={known.type}
                className="w-15 min-w-0 shrink-0 px-0 text-[10px]"
              />
            ) : null}
            <span className="min-w-0 flex-1 truncate">
              {known?.name ?? value}
            </span>
            {known && known.basePower > 0 ? (
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                <span className="sr-only">Power </span>
                {known.basePower}
              </span>
            ) : null}
          </>
        ) : (
          <span className="truncate text-muted-foreground">
            {placeholder ?? label}
          </span>
        )}
      </Combobox>
      {clearable && value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Clear ${label.toLowerCase()}`}
          className="shrink-0 text-muted-foreground"
          onClick={() => onChange(null)}
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}
