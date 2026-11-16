import { ChevronsUpDownIcon } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { matchRank, searchOptions } from "@/components/pokemon-editor/search";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxProps {
  /** Accessible name of the control, e.g. "Item". */
  label: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** What the closed control shows: the current choice or a placeholder. */
  children: ReactNode;
  /**
   * Builds the popover content. It is only called while the popover is open,
   * so long lists cost nothing until then. `close` shuts the popover.
   */
  content: (close: () => void) => ReactNode;
  /** The user is about to open the popover (hover or focus): a chance to preload. */
  onIntent?: () => void;
  /** Leave out the chevron, e.g. when a clear button sits in its place. */
  hideChevron?: boolean;
}

/** A button that opens a popover with a searchable list. */
export function Combobox({
  label,
  id,
  disabled,
  className,
  children,
  content,
  onIntent,
  hideChevron = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          disabled={disabled}
          onPointerEnter={onIntent}
          onFocus={onIntent}
          className={cn(
            "h-8 w-full min-w-0 justify-between gap-1 border-input bg-transparent px-2 font-normal",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
            {children}
          </span>
          {hideChevron ? null : (
            <ChevronsUpDownIcon
              aria-hidden
              className="size-3.5 text-muted-foreground"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="w-[min(22rem,calc(100vw-1rem))] min-w-(--radix-popover-trigger-width) gap-0 p-0"
      >
        {open ? content(() => setOpen(false)) : null}
      </PopoverContent>
    </Popover>
  );
}

export interface OptionGroup<T> {
  heading?: string;
  options: readonly T[];
}

export interface OptionListProps<T> {
  /** Accessible name of the search field, e.g. "Search moves". */
  label: string;
  placeholder: string;
  groups: readonly OptionGroup<T>[];
  /** Unique name of an option; also what the search matches first. */
  getName: (option: T) => string;
  /** Extra text an option can be found by (types, description...). */
  getKeywords?: (option: T) => readonly string[];
  /** Accessible name of an option, when its content reads poorly as plain text. */
  getLabel?: (option: T) => string;
  renderOption: (option: T) => ReactNode;
  /** Name of the current choice, or null. */
  selected: string | null;
  onSelect: (name: string) => void;
  /** Message shown when the search matches nothing. */
  emptyText: string;
  /** When set, a first entry with this text clears the choice. */
  noneLabel?: string;
  onSelectNone?: () => void;
  /** Fixed content between the search field and the list, e.g. column titles. */
  header?: ReactNode;
}

/** Options rendered at first, and added each time the list is scrolled to its end. */
const PAGE_SIZE = 50;
/** Distance from the bottom, in pixels, at which more options are added. */
const LOAD_MORE_MARGIN = 240;
const NONE_VALUE = "(none)";

function takeFirst<T>(
  groups: readonly OptionGroup<T>[],
  limit: number,
): OptionGroup<T>[] {
  const taken: OptionGroup<T>[] = [];
  let remaining = limit;
  for (const group of groups) {
    if (remaining <= 0) break;
    const options = group.options.slice(0, remaining);
    remaining -= options.length;
    if (options.length > 0) taken.push({ heading: group.heading, options });
  }
  return taken;
}

/**
 * Search field plus grouped options, meant to sit inside a `Combobox`
 * popover. Filtering is done here (not by cmdk) and long lists are rendered a
 * page at a time, so opening a list of 500 moves stays cheap.
 */
export function OptionList<T>({
  label,
  placeholder,
  groups,
  getName,
  getKeywords,
  getLabel,
  renderOption,
  selected,
  onSelect,
  emptyText,
  noneLabel,
  onSelectNone,
  header,
}: OptionListProps<T>) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const listRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(
    () =>
      groups.map((group) => ({
        heading: group.heading,
        options: searchOptions(group.options, query, getName, getKeywords),
      })),
    [groups, query, getName, getKeywords],
  );
  const total = matches.reduce((sum, group) => sum + group.options.length, 0);
  const visible = takeFirst(matches, limit);
  const showNone = noneLabel !== undefined && matchRank(noneLabel, query) >= 0;

  return (
    <Command shouldFilter={false} label={label}>
      <CommandInput
        placeholder={placeholder}
        value={query}
        onValueChange={(next) => {
          setQuery(next);
          setLimit(PAGE_SIZE);
          if (listRef.current) listRef.current.scrollTop = 0;
        }}
      />
      {header}
      <CommandList
        ref={listRef}
        className="max-h-[min(18rem,calc(var(--radix-popover-content-available-height)_-_4rem))] [scrollbar-width:thin]!"
        onScroll={(event) => {
          const list = event.currentTarget;
          const distanceToEnd =
            list.scrollHeight - list.scrollTop - list.clientHeight;
          if (limit < total && distanceToEnd < LOAD_MORE_MARGIN) {
            setLimit((current) => current + PAGE_SIZE);
          }
        }}
      >
        {showNone ? (
          <CommandGroup>
            <CommandItem
              value={NONE_VALUE}
              data-checked={selected === null}
              onSelect={() => onSelectNone?.()}
            >
              <span className="text-muted-foreground">{noneLabel}</span>
            </CommandItem>
          </CommandGroup>
        ) : null}
        {visible.map((group, index) => (
          <CommandGroup key={group.heading ?? index} heading={group.heading}>
            {group.options.map((option) => {
              const name = getName(option);
              return (
                <CommandItem
                  key={name}
                  value={name}
                  aria-label={getLabel?.(option)}
                  data-checked={name === selected}
                  onSelect={() => onSelect(name)}
                >
                  {renderOption(option)}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
        {total === 0 && !showNone ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : null}
      </CommandList>
    </Command>
  );
}
