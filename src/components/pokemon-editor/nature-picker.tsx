import { useMemo } from "react";

import {
  Combobox,
  OptionList,
  type OptionGroup,
} from "@/components/pokemon-editor/combobox";
import { getNature, listNatures, type NatureInfo } from "@/data";
import { STAT_LABELS, type StatId } from "@/types/pokemon";

export interface NaturePickerProps {
  /** Selected nature name. */
  value: string;
  onChange: (nature: string) => void;
  className?: string;
  /** Id of the control, for a `<label htmlFor>`. */
  id?: string;
  /** Accessible name of the control. Default "Nature". */
  label?: string;
}

/** Full stat names, so a nature can be found by "attack" or "speed". */
const STAT_NAMES: Record<StatId, string> = {
  hp: "HP",
  atk: "Attack",
  def: "Defense",
  spa: "Special Attack",
  spd: "Special Defense",
  spe: "Speed",
};

/** The effect shown next to a nature, e.g. "+Spe -SpA" or "Neutral". */
function natureEffect(nature: NatureInfo): string {
  if (!nature.plus || !nature.minus) return "Neutral";
  return `+${STAT_LABELS[nature.plus]} -${STAT_LABELS[nature.minus]}`;
}

const getName = (nature: NatureInfo) => nature.name;
const getKeywords = (nature: NatureInfo): readonly string[] =>
  nature.plus && nature.minus
    ? [STAT_NAMES[nature.plus], STAT_NAMES[nature.minus]]
    : ["Neutral"];

function renderNature(nature: NatureInfo) {
  return (
    <>
      <span className="min-w-0 flex-1 truncate">{nature.name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {natureEffect(nature)}
      </span>
    </>
  );
}

function NatureOptions({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (nature: string) => void;
}) {
  const groups = useMemo<OptionGroup<NatureInfo>[]>(
    () => [{ options: listNatures() }],
    [],
  );

  return (
    <OptionList
      label="Search natures"
      placeholder="Search natures or stats…"
      groups={groups}
      getName={getName}
      getKeywords={getKeywords}
      renderOption={renderNature}
      selected={selected}
      onSelect={onSelect}
      emptyText="No nature found."
    />
  );
}

/** Picks one of the 25 natures, showing the stats it raises and lowers. */
export function NaturePicker({
  value,
  onChange,
  className,
  id,
  label = "Nature",
}: NaturePickerProps) {
  const known = getNature(value);
  const effect = known ? natureEffect(known) : null;

  return (
    <Combobox
      id={id}
      label={label}
      className={className}
      content={(close) => (
        <NatureOptions
          selected={known?.name ?? value}
          onSelect={(nature) => {
            close();
            onChange(nature);
          }}
        />
      )}
    >
      <span className="min-w-0 flex-1 truncate">{known?.name ?? value}</span>
      {effect ? (
        <span className="shrink-0 text-xs text-muted-foreground">{effect}</span>
      ) : null}
    </Combobox>
  );
}
