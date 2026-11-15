import { useMemo } from "react";

import {
  Combobox,
  OptionList,
  type OptionGroup,
} from "@/components/pokemon-editor/combobox";
import { PokemonIcon } from "@/components/pokemon-sprite";
import { TypeBadge } from "@/components/type-badge";
import { getSpecies, listSpecies, type SpeciesInfo } from "@/data";

export interface SpeciesPickerProps {
  /** Selected species name, or null when nothing is picked yet. */
  value: string | null;
  onChange: (species: string) => void;
  allowBattleOnly?: boolean;
  placeholder?: string;
  className?: string;
  /** Id of the control, for a `<label htmlFor>`. */
  id?: string;
  /** Accessible name of the control. Default "Species". */
  label?: string;
}

const getName = (species: SpeciesInfo) => species.name;
const getKeywords = (species: SpeciesInfo) => species.types;

function renderSpecies(species: SpeciesInfo) {
  return (
    <>
      <span aria-hidden className="-my-1 flex shrink-0">
        <PokemonIcon species={species.name} />
      </span>
      <span className="min-w-0 flex-1 truncate">{species.name}</span>
      <span className="flex shrink-0 gap-1">
        {species.types.map((type) => (
          <TypeBadge key={type} type={type} className="min-w-12 px-1" />
        ))}
      </span>
    </>
  );
}

function SpeciesOptions({
  selected,
  allowBattleOnly,
  onSelect,
}: {
  selected: string | null;
  allowBattleOnly: boolean;
  onSelect: (species: string) => void;
}) {
  const groups = useMemo<OptionGroup<SpeciesInfo>[]>(
    () => [{ options: listSpecies({ includeBattleOnly: allowBattleOnly }) }],
    [allowBattleOnly],
  );
  return (
    <OptionList
      label="Search Pokémon"
      placeholder="Search Pokémon or type…"
      groups={groups}
      getName={getName}
      getKeywords={getKeywords}
      renderOption={renderSpecies}
      selected={selected}
      onSelect={onSelect}
      emptyText="No Pokémon found."
    />
  );
}

/** Picks one species from the Champions roster. */
export function SpeciesPicker({
  value,
  onChange,
  allowBattleOnly = false,
  placeholder = "Choose a Pokémon",
  className,
  id,
  label = "Species",
}: SpeciesPickerProps) {
  const known = value ? getSpecies(value) : undefined;

  return (
    <Combobox
      id={id}
      label={label}
      className={className}
      content={(close) => (
        <SpeciesOptions
          selected={known?.name ?? value}
          allowBattleOnly={allowBattleOnly}
          onSelect={(species) => {
            close();
            onChange(species);
          }}
        />
      )}
    >
      {value ? (
        <>
          {known ? (
            <span aria-hidden className="flex shrink-0">
              <PokemonIcon species={known.name} />
            </span>
          ) : null}
          <span className="truncate font-medium">{known?.name ?? value}</span>
        </>
      ) : (
        <span className="truncate text-muted-foreground">{placeholder}</span>
      )}
    </Combobox>
  );
}
