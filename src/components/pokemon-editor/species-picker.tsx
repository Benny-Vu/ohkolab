import { useCallback, useMemo } from "react";

import {
  Combobox,
  OptionList,
  type OptionGroup,
} from "@/components/pokemon-editor/combobox";
import { PokemonIcon } from "@/components/pokemon-sprite";
import { TypeBadge } from "@/components/type-badge";
import {
  getSpecies,
  listSpecies,
  useDisplayName,
  type SpeciesInfo,
} from "@/data";
import { useT } from "@/lib/i18n/t";

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

function SpeciesOptions({
  selected,
  allowBattleOnly,
  onSelect,
}: {
  selected: string | null;
  allowBattleOnly: boolean;
  onSelect: (species: string) => void;
}) {
  const t = useT();
  const display = useDisplayName();
  const groups = useMemo<OptionGroup<SpeciesInfo>[]>(
    () => [{ options: listSpecies({ includeBattleOnly: allowBattleOnly }) }],
    [allowBattleOnly],
  );
  // The Japanese name (the English name until the chunk loads) for search.
  const getAltNames = useCallback(
    (species: SpeciesInfo) => [display("species", species.name)],
    [display],
  );
  const renderSpecies = useCallback(
    (species: SpeciesInfo) => (
      <>
        <span aria-hidden className="-my-1 flex shrink-0">
          <PokemonIcon species={species.name} />
        </span>
        <span className="min-w-0 flex-1 truncate">
          {display("species", species.name)}
        </span>
        <span className="flex shrink-0 gap-1">
          {species.types.map((type) => (
            <TypeBadge key={type} type={type} className="min-w-12 px-1" />
          ))}
        </span>
      </>
    ),
    [display],
  );

  return (
    <OptionList
      label={t("pokemonEditor.searchSpecies")}
      placeholder={t("pokemonEditor.searchSpeciesPlaceholder")}
      groups={groups}
      getName={getName}
      getKeywords={getKeywords}
      getAltNames={getAltNames}
      getLabel={(species) => display("species", species.name)}
      renderOption={renderSpecies}
      selected={selected}
      onSelect={onSelect}
      emptyText={t("pokemonEditor.noSpecies")}
    />
  );
}

/** Picks one species from the Champions roster. */
export function SpeciesPicker({
  value,
  onChange,
  allowBattleOnly = false,
  placeholder,
  className,
  id,
  label,
}: SpeciesPickerProps) {
  const t = useT();
  const display = useDisplayName();
  const known = value ? getSpecies(value) : undefined;
  const chosenLabel = label ?? t("pokemonEditor.species");
  const chosenPlaceholder = placeholder ?? t("pokemonEditor.chooseSpecies");

  return (
    <Combobox
      id={id}
      label={chosenLabel}
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
          <span className="truncate font-medium">
            {known ? display("species", known.name) : value}
          </span>
        </>
      ) : (
        <span className="truncate text-muted-foreground">
          {chosenPlaceholder}
        </span>
      )}
    </Combobox>
  );
}
