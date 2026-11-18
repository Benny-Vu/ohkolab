import { useCallback, useMemo } from "react";

import {
  Combobox,
  OptionList,
  type OptionGroup,
} from "@/components/pokemon-editor/combobox";
import {
  getAbility,
  getSpecies,
  useDisplayName,
  useDisplayDescription,
  type AbilityInfo,
} from "@/data";
import { useT } from "@/lib/i18n/t";

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

function AbilityOptions({
  selected,
  species,
  onSelect,
}: {
  selected: string | null;
  species: string | undefined;
  onSelect: (ability: string) => void;
}) {
  const t = useT();
  const display = useDisplayName();
  const describe = useDisplayDescription();
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
  const getAltNames = useCallback(
    (ability: AbilityInfo) => [display("ability", ability.name)],
    [display],
  );
  const renderAbility = useCallback(
    (ability: AbilityInfo) => {
      const description = describe("ability", ability.name);
      return (
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate">{display("ability", ability.name)}</span>
          {description ? (
            <span className="line-clamp-2 text-xs text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>
      );
    },
    [describe, display],
  );

  return (
    <OptionList
      label={t("pokemonEditor.searchAbilities")}
      placeholder={t("pokemonEditor.searchAbilitiesPlaceholder")}
      groups={groups}
      getName={getName}
      getKeywords={getKeywords}
      getAltNames={getAltNames}
      getLabel={(ability) => display("ability", ability.name)}
      renderOption={renderAbility}
      selected={selected}
      onSelect={onSelect}
      emptyText={t("pokemonEditor.noAbility")}
    />
  );
}

/** Picks one of the species' abilities. */
export function AbilityPicker({
  value,
  onChange,
  species,
  placeholder,
  className,
  id,
  label,
}: AbilityPickerProps) {
  const t = useT();
  const display = useDisplayName();
  const known = value ? getAbility(value) : undefined;
  const chosenLabel = label ?? t("pokemonEditor.ability");
  const chosenPlaceholder = placeholder ?? t("pokemonEditor.chooseAbility");

  return (
    <Combobox
      id={id}
      label={chosenLabel}
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
        <span className="truncate">
          {known ? display("ability", known.name) : value}
        </span>
      ) : (
        <span className="truncate text-muted-foreground">
          {chosenPlaceholder}
        </span>
      )}
    </Combobox>
  );
}
