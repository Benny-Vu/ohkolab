import { useCallback, useMemo } from "react";

import {
  Combobox,
  OptionList,
  type OptionGroup,
} from "@/components/pokemon-editor/combobox";
import { statLabel, type Translate } from "@/components/stat-labels";
import {
  getNature,
  listNatures,
  useDisplayName,
  type NatureInfo,
} from "@/data";
import { useT } from "@/lib/i18n/t";
import type { StatId } from "@/types/pokemon";

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
function natureEffect(nature: NatureInfo, t: Translate): string {
  if (!nature.plus || !nature.minus) return t("pokemonEditor.neutral");
  return `+${statLabel(t, nature.plus)} -${statLabel(t, nature.minus)}`;
}

const getName = (nature: NatureInfo) => nature.name;

function NatureOptions({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (nature: string) => void;
}) {
  const t = useT();
  const display = useDisplayName();
  const groups = useMemo<OptionGroup<NatureInfo>[]>(
    () => [{ options: listNatures() }],
    [],
  );
  const getKeywords = useCallback(
    (nature: NatureInfo): readonly string[] =>
      nature.plus && nature.minus
        ? [STAT_NAMES[nature.plus], STAT_NAMES[nature.minus]]
        : ["Neutral"],
    [],
  );
  const getAltNames = useCallback(
    (nature: NatureInfo) => [display("nature", nature.name)],
    [display],
  );
  const renderNature = useCallback(
    (nature: NatureInfo) => (
      <>
        <span className="min-w-0 flex-1 truncate">
          {display("nature", nature.name)}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {natureEffect(nature, t)}
        </span>
      </>
    ),
    [display, t],
  );

  return (
    <OptionList
      label={t("pokemonEditor.searchNatures")}
      placeholder={t("pokemonEditor.searchNaturesPlaceholder")}
      groups={groups}
      getName={getName}
      getKeywords={getKeywords}
      getAltNames={getAltNames}
      getLabel={(nature) => display("nature", nature.name)}
      renderOption={renderNature}
      selected={selected}
      onSelect={onSelect}
      emptyText={t("pokemonEditor.noNature")}
    />
  );
}

/** Picks one of the 25 natures, showing the stats it raises and lowers. */
export function NaturePicker({
  value,
  onChange,
  className,
  id,
  label,
}: NaturePickerProps) {
  const t = useT();
  const display = useDisplayName();
  const known = getNature(value);
  const effect = known ? natureEffect(known, t) : null;
  const chosenLabel = label ?? t("pokemonEditor.nature");

  return (
    <Combobox
      id={id}
      label={chosenLabel}
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
      <span className="min-w-0 flex-1 truncate">
        {known ? display("nature", known.name) : value}
      </span>
      {effect ? (
        <span className="shrink-0 text-xs text-muted-foreground">{effect}</span>
      ) : null}
    </Combobox>
  );
}
