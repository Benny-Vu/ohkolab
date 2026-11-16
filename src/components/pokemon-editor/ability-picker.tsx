import { useMemo } from "react";

import {
  Combobox,
  OptionList,
  type OptionGroup,
} from "@/components/pokemon-editor/combobox";
import { getAbility, getSpecies, type AbilityInfo } from "@/data";

export interface AbilityPickerProps {
  /** Selected ability name, or null when none is picked yet. */
  value: string | null;
  onChange: (ability: string) => void;
  /** The species: only its abilities are offered. */
  species?: string;
  placeholder?: string;
  className?: string;
  /** Id of the control, for a `<label htmlFor>`. */
  id?: string;
  /** Accessible name of the control. Default "Ability". */
  label?: string;
}

const getName = (ability: AbilityInfo) => ability.name;
const getKeywords = (ability: AbilityInfo) => [ability.shortDesc];

function renderAbility(ability: AbilityInfo) {
  return (
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span className="truncate">{ability.name}</span>
      {ability.shortDesc ? (
        <span className="line-clamp-2 text-xs text-muted-foreground">
          {ability.shortDesc}
        </span>
      ) : null}
    </span>
  );
}

function AbilityOptions({
  selected,
  species,
  onSelect,
}: {
  selected: string | null;
  species: string | undefined;
  onSelect: (ability: string) => void;
}) {
  const groups = useMemo<OptionGroup<AbilityInfo>[]>(() => {
    const names = species ? getSpecies(species)?.abilities : undefined;
    return [
      {
        options: (names ?? []).map(
          (name) =>
            getAbility(name) ??
            ({ name, id: name.toLowerCase(), shortDesc: "" } as AbilityInfo),
        ),
      },
    ];
  }, [species]);

  return (
    <OptionList
      label="Search abilities"
      placeholder="Search abilities…"
      groups={groups}
      getName={getName}
      getKeywords={getKeywords}
      renderOption={renderAbility}
      selected={selected}
      onSelect={onSelect}
      emptyText="No ability found."
    />
  );
}

/** Picks one of the species' abilities. */
export function AbilityPicker({
  value,
  onChange,
  species,
  placeholder = "Choose an ability",
  className,
  id,
  label = "Ability",
}: AbilityPickerProps) {
  const known = value ? getAbility(value) : undefined;

  return (
    <Combobox
      id={id}
      label={label}
      className={className}
      content={(close) => (
        <AbilityOptions
          selected={known?.name ?? value}
          species={species}
          onSelect={(ability) => {
            close();
            onChange(ability);
          }}
        />
      )}
    >
      {value ? (
        <span className="truncate">{known?.name ?? value}</span>
      ) : (
        <span className="truncate text-muted-foreground">{placeholder}</span>
      )}
    </Combobox>
  );
}
