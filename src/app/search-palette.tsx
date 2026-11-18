import * as React from "react";
import { useNavigate } from "react-router";
import { SearchIcon } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { track } from "@/lib/telemetry/analytics";
import type { SearchKind } from "@/lib/telemetry/events";
import { cn } from "@/lib/utils";

interface SearchEntry {
  kind: SearchKind;
  label: string;
  keywords: string;
  /** Where to go when chosen. */
  to: string;
}

/** Static page entries; Pokémon, moves and items load lazily on first open. */
const PAGE_ENTRIES: SearchEntry[] = [
  { kind: "page", label: "Home", keywords: "home feed", to: "/" },
  {
    kind: "page",
    label: "Damage calculator",
    keywords: "calc calculator damage",
    to: "/calc",
  },
  {
    kind: "page",
    label: "Team builder",
    keywords: "teams team builder",
    to: "/teams",
  },
  {
    kind: "page",
    label: "Metagame",
    keywords: "meta metagame usage",
    to: "/meta",
  },
  {
    kind: "page",
    label: "Profile",
    keywords: "profile account",
    to: "/profile",
  },
];

let dataEntries: SearchEntry[] | undefined;

async function loadDataEntries(): Promise<SearchEntry[]> {
  if (dataEntries) return dataEntries;
  const { listSpecies, listMoves, listItems } = await import("@/data");
  const species = listSpecies({ includeBattleOnly: true }).map((info) => ({
    kind: "pokemon" as const,
    label: info.name,
    keywords: info.name,
    to: `/calc?species=${encodeURIComponent(info.name)}`,
  }));
  const moves = listMoves().map((info) => ({
    kind: "move" as const,
    label: info.name,
    keywords: `${info.name} ${info.type} ${info.category}`,
    to: `/calc?move=${encodeURIComponent(info.name)}`,
  }));
  const items = listItems().map((info) => ({
    kind: "item" as const,
    label: info.name,
    keywords: info.name,
    to: `/calc?item=${encodeURIComponent(info.name)}`,
  }));
  dataEntries = [...species, ...moves, ...items];
  return dataEntries;
}

const KIND_LABELS: Record<SearchKind, string> = {
  page: "Pages",
  pokemon: "Pokémon",
  move: "Moves",
  item: "Items",
};

/**
 * Global search palette (Ctrl/⌘K): pages plus every Pokémon, move and item.
 * Pokémon data is imported lazily so it stays out of the entry chunk.
 */
export function SearchPalette() {
  const [open, setOpen] = React.useState(false);
  const [entries, setEntries] = React.useState<SearchEntry[]>(PAGE_ENTRIES);
  const navigate = useNavigate();

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((wasOpen) => {
          if (!wasOpen) void track("search_opened", { kind: "page" });
          return !wasOpen;
        });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const openPalette = async () => {
    setOpen(true);
    void track("search_opened", { kind: "page" });
    const loaded = await loadDataEntries();
    setEntries(loaded);
  };

  const choose = (entry: SearchEntry) => {
    setOpen(false);
    void track("search_result_chosen", { kind: entry.kind });
    navigate(entry.to);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        aria-label="Search Pokémon, moves, players"
        className="hidden h-9 w-64 items-center gap-2 rounded-md bg-surface-sunken px-3 text-sm text-muted-foreground transition-colors duration-150 ease-out outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:flex"
      >
        <SearchIcon className="size-4" aria-hidden />
        <span className="flex-1 text-left">Search Pokémon, moves, players</span>
        <kbd className="rounded-[4px] border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
          Ctrl K
        </kbd>
      </button>
      <button
        type="button"
        onClick={openPalette}
        aria-label="Search"
        className="grid size-9 place-content-center rounded-md text-muted-foreground transition-colors duration-150 ease-out outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
      >
        <SearchIcon className="size-5" aria-hidden />
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        aria-label="Search Pokémon, moves, players"
      >
        <CommandInput placeholder="Search Pokémon, moves, players" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {(Object.keys(KIND_LABELS) as SearchKind[]).map((kind) => {
            const group = entries.filter((entry) => entry.kind === kind);
            if (group.length === 0) return null;
            return (
              <CommandGroup key={kind} heading={KIND_LABELS[kind]}>
                {group.map((entry) => (
                  <CommandItem
                    key={`${entry.kind}:${entry.label}`}
                    value={`${entry.label} ${entry.keywords}`}
                    onSelect={() => choose(entry)}
                  >
                    <span
                      className={cn(
                        "text-xs text-muted-foreground",
                        entry.kind !== "page" && "w-16 shrink-0",
                      )}
                    >
                      {entry.kind === "page" ? "" : KIND_LABELS[entry.kind]}
                    </span>
                    {entry.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
