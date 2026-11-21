import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { SearchIcon } from "lucide-react";

import {
  entriesForSection,
  findLearnSection,
  localized,
  localizedBody,
  type LearnEntry,
} from "@/features/learn/guides";
import { LearnFrame } from "@/features/learn/learn-frame";
import { ShortEntry } from "@/features/learn/entry-blocks";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";

/**
 * The Vocabulary page: a searchable A–Z glossary. The search field filters
 * the terms (either language matches); deep links like /learn/vocabulary
 * #stab open and highlight the term. English groups the terms under
 * their first letter; Japanese lists them flat.
 */
export function VocabularyPage() {
  const t = useT();
  const [locale] = useLocale();
  const { hash } = useLocation();
  const [query, setQuery] = useState("");

  const entries = entriesForSection("vocabulary");
  const info = findLearnSection("vocabulary");
  const openSlug = hash ? decodeURIComponent(hash.slice(1)) : "";

  // The deep-linked term opens once the page has mounted.
  useEffect(() => {
    if (!openSlug) return;
    document.getElementById(openSlug)?.scrollIntoView();
  }, [openSlug]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) =>
      [entry.title.en, entry.title.ja, ...localizedBody(entry.body, "en")]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [entries, query]);

  const groups = useMemo(() => {
    if (locale === "ja") {
      return [{ letter: "", entries: filtered }];
    }
    const byLetter = new Map<string, LearnEntry[]>();
    for (const entry of filtered) {
      const letter = (entry.title.en[0] ?? "?").toUpperCase();
      const bucket = byLetter.get(letter) ?? [];
      bucket.push(entry);
      byLetter.set(letter, bucket);
    }
    return [...byLetter.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, group]) => ({ letter, entries: group }));
  }, [filtered, locale]);

  return (
    <LearnFrame section="vocabulary">
      <article className="grid gap-3">
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          {info ? localized(info.title, locale) : "Vocabulary"}
        </h1>

        <div className="relative">
          <SearchIcon
            aria-hidden
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("learn.searchPlaceholder")}
            aria-label={t("learn.searchTerms")}
            className="pl-9"
          />
        </div>

        {groups.map((group) => (
          <section
            key={group.letter || "all"}
            className="grid gap-1.5"
            aria-label={group.letter || undefined}
          >
            {group.letter ? (
              <h2 className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.letter}
              </h2>
            ) : null}
            {group.entries.map((entry) => (
              <ShortEntry
                key={entry.slug}
                entry={entry}
                defaultOpen={entry.slug === openSlug}
                highlighted={entry.slug === openSlug}
              />
            ))}
          </section>
        ))}
      </article>
    </LearnFrame>
  );
}
