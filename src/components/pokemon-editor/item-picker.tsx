import { useCallback, useMemo } from "react";

import {
  Combobox,
  OptionList,
  type OptionGroup,
} from "@/components/pokemon-editor/combobox";
import { ItemIcon } from "@/components/pokemon-sprite";
import {
  getItem,
  listItems,
  listItemsFor,
  useDisplayName,
  type ItemInfo,
} from "@/data";
import { useT } from "@/lib/i18n/t";

export interface ItemPickerProps {
  /** Held item name, or null for no item. */
  value: string | null;
  onChange: (item: string | null) => void;
  /**
   * The holder. Limits Mega Stones to the ones it can use and lists them
   * first. Without it every item is offered.
   */
  species?: string;
  placeholder?: string;
  className?: string;
  /** Id of the control, for a `<label htmlFor>`. */
  id?: string;
  /** Accessible name of the control. Default "Item". */
  label?: string;
}

const getName = (item: ItemInfo) => item.name;
const getKeywords = (item: ItemInfo) => [item.shortDesc];

function ItemOptions({
  selected,
  species,
  onSelect,
}: {
  selected: string | null;
  species: string | undefined;
  onSelect: (item: string | null) => void;
}) {
  const t = useT();
  const display = useDisplayName();
  const groups = useMemo<OptionGroup<ItemInfo>[]>(() => {
    if (!species) return [{ options: listItems() }];
    const items = listItemsFor(species);
    const stones = items.filter((item) => item.megaStoneFor !== null);
    if (stones.length === 0) return [{ options: items }];
    return [
      { heading: t("pokemonEditor.megaStones"), options: stones },
      {
        heading: t("pokemonEditor.items"),
        options: items.filter((item) => item.megaStoneFor === null),
      },
    ];
  }, [species, t]);
  const getAltNames = useCallback(
    (item: ItemInfo) => [display("item", item.name)],
    [display],
  );
  const renderItem = useCallback(
    (item: ItemInfo) => (
      <>
        <span aria-hidden className="flex shrink-0 self-start">
          <ItemIcon item={item.name} />
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate">{display("item", item.name)}</span>
          {item.shortDesc ? (
            <span className="line-clamp-2 text-xs text-muted-foreground">
              {item.shortDesc}
            </span>
          ) : null}
        </span>
      </>
    ),
    [display],
  );

  return (
    <OptionList
      label={t("pokemonEditor.searchItems")}
      placeholder={t("pokemonEditor.searchItemsPlaceholder")}
      groups={groups}
      getName={getName}
      getKeywords={getKeywords}
      getAltNames={getAltNames}
      getLabel={(item) => display("item", item.name)}
      renderOption={renderItem}
      selected={selected}
      onSelect={onSelect}
      noneLabel={t("pokemonEditor.none")}
      onSelectNone={() => onSelect(null)}
      emptyText={t("pokemonEditor.noItem")}
    />
  );
}

/** Picks a held item, or none. */
export function ItemPicker({
  value,
  onChange,
  species,
  placeholder,
  className,
  id,
  label,
}: ItemPickerProps) {
  const t = useT();
  const display = useDisplayName();
  const known = value ? getItem(value) : undefined;
  const chosenLabel = label ?? t("pokemonEditor.item");
  const chosenPlaceholder = placeholder ?? t("pokemonEditor.none");

  return (
    <Combobox
      id={id}
      label={chosenLabel}
      className={className}
      content={(close) => (
        <ItemOptions
          selected={known?.name ?? value}
          species={species}
          onSelect={(item) => {
            close();
            onChange(item);
          }}
        />
      )}
    >
      {value ? (
        <>
          {known ? (
            <span aria-hidden className="flex shrink-0">
              <ItemIcon item={known.name} />
            </span>
          ) : null}
          <span className="truncate">
            {known ? display("item", known.name) : value}
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
