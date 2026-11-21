import {
  entriesForSection,
  findLearnSection,
  localized,
  type LearnSectionId,
} from "@/features/learn/guides";
import { LearnFrame } from "@/features/learn/learn-frame";
import { LongEntryRow, ShortEntry } from "@/features/learn/entry-blocks";
import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/lib/i18n/locale";

/**
 * A registry-driven section page (Concepts, Field conditions): long
 * entries as summary rows with "Read", short entries in full — a toggle
 * row on phones, a card on desktop. No subtitle: the hub carries the
 * section descriptions.
 */
export function SectionPage({
  section,
}: {
  section: Exclude<LearnSectionId, "vocabulary" | "types">;
}) {
  const [locale] = useLocale();
  const entries = entriesForSection(section);
  const info = findLearnSection(section);

  return (
    <LearnFrame section={section}>
      <article className="grid gap-3">
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          {info ? localized(info.title, locale) : section}
        </h1>
        {entries.length === 0 ? (
          <EmptyState title="Nothing here yet." />
        ) : (
          entries.map((entry) =>
            entry.long ? (
              <LongEntryRow key={entry.slug} entry={entry} />
            ) : (
              <ShortEntry key={entry.slug} entry={entry} />
            ),
          )
        )}
      </article>
    </LearnFrame>
  );
}

/** The Concepts section page at /learn/concepts. */
export function ConceptsPage() {
  return <SectionPage section="concepts" />;
}

/** The Field conditions section page at /learn/field. */
export function FieldPage() {
  return <SectionPage section="field" />;
}
