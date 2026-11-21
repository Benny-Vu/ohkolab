import { useState } from "react";
import { Link } from "react-router";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import {
  findLearnEntry,
  localized,
  localizedBody,
  type LearnEntry,
} from "@/features/learn/guides";
import { linkHitClass } from "@/components/touch-targets";
import { useMediaQuery } from "@/lib/use-media-query";
import { useLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";

/**
 * How one registry entry renders on a section page. A long entry is a
 * summary row with "Read →" to its own page (both layouts). A short
 * entry opens in place on phones — a toggle row — and shows as a full
 * card on desktop, where the owner found toggles too cluttered.
 */

/**
 * The link a vocabulary term carries to its guide: a long target goes to
 * its page, a short one to its anchor on its section page.
 */
function GuideLink({ slug }: { slug: string }) {
  const [locale] = useLocale();
  const t = useT();
  const target = findLearnEntry(slug);
  if (!target) return null;
  return (
    <Link
      to={
        target.long
          ? `/learn/${target.slug}`
          : `/learn/${target.section}#${target.slug}`
      }
      className={`justify-self-start text-foreground underline decoration-muted-foreground underline-offset-4 transition-colors duration-(--motion-fast) ease-(--motion-ease-out) outline-none hover:decoration-foreground focus-visible:ring-3 focus-visible:ring-ring/50 ${linkHitClass}`}
    >
      {t("learn.readGuide", { title: localized(target.title, locale) })} →
    </Link>
  );
}

/** Body paragraphs of an entry, capped at prose measure. */
function EntryBody({ entry }: { entry: LearnEntry }) {
  const [locale] = useLocale();
  return (
    <div className="grid gap-2">
      {localizedBody(entry.body, locale).map((paragraph, index) => (
        <p
          key={index}
          className="max-w-xl text-sm leading-relaxed sm:text-base"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

/** A short entry on a phone: a row that opens its full text in place. */
function ToggleRow({
  entry,
  open,
  onOpenChange,
  highlighted,
}: {
  entry: LearnEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlighted?: boolean;
}) {
  const [locale] = useLocale();
  return (
    <div
      id={entry.slug}
      className={cn(
        "scroll-mt-24 rounded-md border bg-card",
        highlighted && "border-accent-brand-text",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-md p-4 text-left outline-none transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:bg-surface-sunken focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="min-w-0 font-heading text-sm font-semibold">
          {localized(entry.title, locale)}
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-base) ease-(--motion-ease-out)",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="grid gap-2 p-4 pt-0">
          <EntryBody entry={entry} />
          {entry.guide ? <GuideLink slug={entry.guide} /> : null}
        </div>
      ) : null}
    </div>
  );
}

/** A short entry on desktop: a full card, no toggle. */
function FullCard({ entry }: { entry: LearnEntry }) {
  const [locale] = useLocale();
  return (
    <section
      id={entry.slug}
      className="grid scroll-mt-24 gap-3 rounded-md border bg-card p-4"
    >
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        {localized(entry.title, locale)}
      </h2>
      <EntryBody entry={entry} />
      {entry.guide ? <GuideLink slug={entry.guide} /> : null}
    </section>
  );
}

/** A short entry: toggle row on phones, full card on desktop. */
export function ShortEntry({
  entry,
  defaultOpen = false,
  highlighted = false,
}: {
  entry: LearnEntry;
  /** Opens the row on a phone (deep links from the sidebar). */
  defaultOpen?: boolean;
  /** Marks the deep-linked term. */
  highlighted?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  if (isDesktop) {
    return <FullCard entry={entry} />;
  }
  return (
    <ToggleRow
      entry={entry}
      open={open}
      onOpenChange={setOpen}
      highlighted={highlighted}
    />
  );
}

/** A long entry: its one-line summary and a "Read →" to its own page. */
export function LongEntryRow({ entry }: { entry: LearnEntry }) {
  const [locale] = useLocale();
  const t = useT();
  return (
    <Link
      id={entry.slug}
      to={`/learn/${entry.slug}`}
      className="group flex scroll-mt-24 items-start justify-between gap-3 rounded-md border bg-card p-4 outline-none transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:bg-surface-sunken focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="min-w-0">
        <span className="block font-heading text-sm font-semibold">
          {localized(entry.title, locale)}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {localized(entry.summary, locale)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 pt-0.5 text-sm font-medium text-foreground">
        {t("learn.read")}
        <ChevronRightIcon
          aria-hidden
          className="size-4 transition-transform duration-(--motion-base) ease-(--motion-ease-out) group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
