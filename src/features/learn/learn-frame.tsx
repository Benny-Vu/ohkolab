import type { ReactNode } from "react";
import { Link } from "react-router";

import {
  LEARN_SECTIONS,
  entriesForSection,
  guideEntriesForSection,
  localized,
  type LearnEntry,
  type LearnSectionId,
} from "@/features/learn/guides";
import { linkHitClass } from "@/components/touch-targets";
import { useActiveAnchor } from "@/features/learn/use-active-anchor";
import { useLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";

/**
 * The frame every page below the /learn hub renders in: on desktop a row
 * of section tabs across the top and an "In this section" sidebar beside
 * the content; on phones just the content (the hub covers navigation).
 */

/** The tab row: the four sections, the active one underlined. */
function SectionTabs({ active }: { active: LearnSectionId }) {
  const [locale] = useLocale();
  return (
    <nav
      aria-label="Learn"
      className="mb-4 hidden items-center gap-1 border-b md:flex"
    >
      {LEARN_SECTIONS.map((section) => {
        const isActive = section.id === active;
        return (
          <Link
            key={section.id}
            to={`/learn/${section.id}`}
            className={cn(
              "relative px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-(--motion-fast) ease-(--motion-ease-out) outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-center after:bg-accent-brand-text after:scale-x-0 after:opacity-0 after:transition-[opacity,transform] after:duration-(--motion-base) after:ease-(--motion-ease-out)",
              isActive && "text-foreground after:scale-x-100 after:opacity-100",
            )}
          >
            {localized(section.title, locale)}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The sidebar list of one section's entries: guides link to their pages,
 * short entries to their anchor on the section page. The current entry is
 * highlighted.
 */
export function SectionSidebar({
  section,
  currentSlug,
}: {
  section: LearnSectionId;
  /** The guide currently open, highlighted in the list. */
  currentSlug?: string;
}) {
  const [locale] = useLocale();
  const t = useT();
  const entries = entriesForSection(section);
  // On the section page the highlight follows the entry being read; on a
  // guide page it marks the open guide.
  const inView = useActiveAnchor(
    currentSlug ? [] : entries.map((entry) => entry.slug),
  );
  return (
    <nav aria-label={t("learn.inThisSection")}>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">
        {t("learn.inThisSection")}
      </p>
      <ul className="grid gap-1.5">
        {entries.map((entry) => {
          const isCurrent = entry.slug === currentSlug;
          const isInView = !currentSlug && entry.slug === inView;
          return (
            <li key={entry.slug}>
              <Link
                to={
                  entry.long
                    ? `/learn/${entry.slug}`
                    : `/learn/${section}#${entry.slug}`
                }
                aria-current={
                  isCurrent ? "page" : isInView ? "location" : undefined
                }
                className={cn(
                  "block rounded-sm px-2 py-1 text-sm text-muted-foreground transition-colors duration-(--motion-fast) ease-(--motion-ease-out) outline-none hover:bg-surface-sunken hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                  (isCurrent || isInView) &&
                    "bg-surface-sunken font-medium text-foreground",
                )}
              >
                {localized(entry.title, locale)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The page frame for everything below the hub: tabs and sidebar on
 * desktop, bare content on phones. The sidebar can be replaced (the types
 * page lists the 18 types instead of registry entries).
 */
export function LearnFrame({
  section,
  sidebar,
  children,
}: {
  section: LearnSectionId;
  /** The sidebar content; defaults to the section's entry list. */
  sidebar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
      <SectionTabs active={section} />
      {/* The "In this section" list sits on the left (owner, matching the
          approved sketch) and follows the scroll: sticky under the header,
          scrolling on its own when it is taller than the screen. */}
      <div className="grid gap-8 md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden self-start overscroll-contain md:sticky md:top-20 md:block md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto md:pr-1">
          {sidebar ?? <SectionSidebar section={section} />}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

/**
 * The previous/next pair at the bottom of a guide page: compact outline
 * buttons pushed to the edges, never content cards.
 */
export function GuidePager({
  section,
  slug,
}: {
  section: LearnSectionId;
  slug: string;
}) {
  const [locale] = useLocale();
  const t = useT();
  const guides = guideEntriesForSection(section);
  const index = guides.findIndex((entry) => entry.slug === slug);
  if (index === -1) return null;
  const prev: LearnEntry | undefined = guides[index - 1];
  const next: LearnEntry | undefined = guides[index + 1];

  const buttonClass = cn(
    "h-9 min-h-0 rounded-md border border-border bg-transparent px-3 text-sm font-medium text-foreground",
    "transition-colors duration-(--motion-fast) ease-(--motion-ease-out) outline-none hover:bg-surface-sunken focus-visible:ring-3 focus-visible:ring-ring/50",
    linkHitClass,
  );

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-between gap-2"
    >
      {prev ? (
        <Link
          to={`/learn/${prev.slug}`}
          aria-label={t("learn.prevAria", {
            title: localized(prev.title, locale),
          })}
          className={buttonClass}
        >
          ← {localized(prev.title, locale)}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={`/learn/${next.slug}`}
          aria-label={t("learn.nextAria", {
            title: localized(next.title, locale),
          })}
          className={buttonClass}
        >
          {localized(next.title, locale)} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
