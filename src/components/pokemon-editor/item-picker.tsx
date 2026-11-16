import { useMemo } from "react";

import {
  Combobox,
  OptionList,
  type OptionGroup,
} from "@/components/pokemon-editor/combobox";
import { ItemIcon } from "@/components/pokemon-sprite";
import { getItem, listItems, listItemsFor, type ItemInfo } from "@/data";

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

function renderItem(item: ItemInfo) {
  return (
    <>
      <span aria-hidden className="flex shrink-0 self-start">
        <ItemIcon item={item.name} />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate">{item.name}</span>
        {item.shortDesc ? (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {item.shortDesc}
          </span>
        ) : null}
      </span>
    </>
  );
}

function ItemOptions({
  selected,
  species,
  onSelect,
}: {
  selected: string | null;
  species: string | undefined;
  onSelect: (item: string | null) => void;
}) {
  const groups = useMemo<OptionGroup<ItemInfo>[]>(() => {
    if (!species) return [{ options: listItems() }];
    const items = listItemsFor(species);
    const stones = items.filter((item) => item.megaStoneFor !== null);
    if (stones.length === 0) return [{ options: items }];
    return [
      { heading: "Mega Stones", options: stones },
      {
        heading: "Items",
        options: items.filter((item) => item.megaStoneFor === null),
      },
    ];
  }, [species]);

  return (
    <OptionList
      label="Search items"
      placeholder="Search items or effects…"
      groups={groups}
      getName={getName}
      getKeywords={getKeywords}
      renderOption={renderItem}
      selected={selected}
      onSelect={onSelect}
      noneLabel="None"
      onSelectNone={() => onSelect(null)}
      emptyText="No item found."
    />
  );
}

/** Picks a held item, or none. */
export function ItemPicker({
  value,
  onChange,
  species,
  placeholder = "None",
  className,
  id,
  label = "Item",
}: ItemPickerProps) {
  const known = value ? getItem(value) : undefined;

  return (
    <Combobox
      id={id}
      label={label}
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
          <span className="truncate">{known?.name ?? value}</span>
        </>
      ) : (
        <span className="truncate text-muted-foreground">{placeholder}</span>
      )}
    </Combobox>
  );
}
