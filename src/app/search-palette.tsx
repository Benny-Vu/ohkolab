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
import { getLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";
import { track } from "@/lib/telemetry/analytics";
import type { SearchKind } from "@/lib/telemetry/events";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n/en";

interface SearchEntry {
  kind: SearchKind;
  label: string;
  keywords: string;
  /** Where to go when chosen. */
  to: string;
}

/** Static page entries; PokÃ©mon, moves and items load lazily on first open. */
const PAGE_ENTRIES: {
  kind: "page";
  labelKey: TranslationKey;
  keywords: string;
  to: string;
}[] = [
  { kind: "page", labelKey: "nav.home", keywords: "home feed", to: "/" },
  {
    kind: "page",
    labelKey: "calc.title",
    keywords: "calc calculator damage",
    to: "/calc",
  },
  {
    kind: "page",
    labelKey: "teams.title",
    keywords: "teams team builder",
    to: "/teams",
  },
  {
    kind: "page",
    labelKey: "meta.title",
    keywords: "meta metagame usage",
    to: "/meta",
  },
  {
    kind: "page",
    labelKey: "nav.profile",
    keywords: "profile account",
    to: "/profile",
  },
];

/** Data entries plus the locale they were built for; rebuilt per locale. */
let dataEntries: SearchEntry[] | undefined;
let dataEntriesLocale: string | undefined;

async function loadDataEntries(locale: string): Promise<SearchEntry[]> {
  if (dataEntries && dataEntriesLocale === locale) return dataEntries;
  const { listSpecies, listMoves, listItems, displayName, loadJapaneseNames } =
    await import("@/data");
  // Japanese users also search the Japanese names; the names chunk is only
  // downloaded for them.
  const ja = locale === "ja";
  if (ja) await loadJapaneseNames().catch(() => {});
  // In Japanese the label itself is the Japanese name (both names stay in
  // the keywords, so either script finds the entry).
  const localized = (kind: "species" | "move" | "item", name: string) =>
    ja ? displayName(kind, name, locale) : name;
  const species = listSpecies({ includeBattleOnly: true }).map((info) => ({
    kind: "pokemon" as const,
    label: localized("species", info.name),
    keywords: `${info.name} ${localized("species", info.name)}`,
    to: `/calc?species=${encodeURIComponent(info.name)}`,
  }));
  const moves = listMoves().map((info) => ({
    kind: "move" as const,
    label: localized("move", info.name),
    keywords: `${info.name} ${info.type} ${info.category} ${localized("move", info.name)}`,
    to: `/calc?move=${encodeURIComponent(info.name)}`,
  }));
  const items = listItems().map((info) => ({
    kind: "item" as const,
    label: localized("item", info.name),
    keywords: `${info.name} ${localized("item", info.name)}`,
    to: `/calc?item=${encodeURIComponent(info.name)}`,
  }));
  dataEntries = [...species, ...moves, ...items];
  dataEntriesLocale = locale;
  return dataEntries;
}

const KIND_LABEL_KEYS: Record<SearchKind, TranslationKey> = {
  page: "search.pages",
  pokemon: "search.pokemon",
  move: "search.moves",
  item: "search.items",
};

/**
 * Global search palette (Ctrl/âŒ˜K): pages plus every PokÃ©mon, move and item.
 * PokÃ©mon data is imported lazily so it stays out of the entry chunk.
 */
export function SearchPalette() {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [entries, setEntries] = React.useState<SearchEntry[]>([]);
  const navigate = useNavigate();

  const pageEntries = React.useMemo<SearchEntry[]>(
    () =>
      PAGE_ENTRIES.map((entry) => ({
        kind: entry.kind,
        label: t(entry.labelKey),
        keywords: entry.keywords,
        to: entry.to,
      })),
    [t],
  );

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
    const loaded = await loadDataEntries(getLocale());
    setEntries(loaded);
  };

  const choose = (entry: SearchEntry) => {
    setOpen(false);
    void track("search_result_chosen", { kind: entry.kind });
    navigate(entry.to, { viewTransition: true });
  };

  const allEntries = [...pageEntries, ...entries];

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        aria-label={t("search.openAria")}
        className="hidden h-9 w-64 items-center gap-2 rounded-md bg-surface-sunken px-3 text-sm text-muted-foreground transition-colors duration-(--motion-fast) ease-(--motion-ease-out) outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:flex"
      >
        <SearchIcon className="size-4" aria-hidden />
        <span className="flex-1 text-left">{t("common.search")}</span>
        <kbd className="rounded-[4px] border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
          Ctrl K
        </kbd>
      </button>
      <button
        type="button"
        onClick={openPalette}
        aria-label={t("common.search")}
        className="grid size-9 place-content-center rounded-md text-muted-foreground transition-colors duration-(--motion-fast) ease-(--motion-ease-out) outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
      >
        <SearchIcon className="size-5" aria-hidden />
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        aria-label={t("search.openAria")}
        title={t("search.paletteTitle")}
        description={t("search.paletteDescription")}
      >
        <CommandInput placeholder={t("search.placeholder")} />
        <CommandList>
          <CommandEmpty>{t("search.noResults")}</CommandEmpty>
          {(Object.keys(KIND_LABEL_KEYS) as SearchKind[]).map((kind) => {
            const group = allEntries.filter((entry) => entry.kind === kind);
            if (group.length === 0) return null;
            return (
              <CommandGroup key={kind} heading={t(KIND_LABEL_KEYS[kind])}>
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
                      {entry.kind === "page"
                        ? ""
                        : t(KIND_LABEL_KEYS[entry.kind])}
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
