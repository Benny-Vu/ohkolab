import type { ReactNode } from "react";

import { Page } from "@/components/page";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";

export interface LegalSection {
  /** Anchor id, unique per page. */
  id: string;
  heading: string;
}

interface LegalPageProps {
  title: string;
  description?: string;
  sections: LegalSection[];
  children: ReactNode;
}

/**
 * Reading layout for the legal pages: a 680px column with a clear heading
 * scale and, on desktop, a table of contents rail. The text itself lives in
 * the page components; this frame only sets the layout. In Japanese mode the
 * pages stay English (the official versions) and carry one Japanese notice
 * line at the top.
 */
export function LegalPage({
  title,
  description,
  sections,
  children,
}: LegalPageProps) {
  const japanese = getLocale() === "ja";
  return (
    <Page title={title} description={description} width="narrow">
      <div className="flex gap-10">
        <nav
          aria-label="On this page"
          className="sticky top-24 hidden w-44 shrink-0 self-start lg:block"
        >
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            On this page
          </p>
          <ul className="grid gap-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 flex-1">
          {japanese && (
            <p
              lang="ja"
              className="mb-6 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground"
            >
              {t("legal.japaneseNotice")}
            </p>
          )}
          {children}
        </div>
      </div>
    </Page>
  );
}

interface LegalSectionProps {
  id: string;
  heading: string;
  children: ReactNode;
  className?: string;
}

/** One numbered section of a legal page: h2 with anchor plus body. */
export function LegalSection({
  id,
  heading,
  children,
  className,
}: LegalSectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-24 space-y-3", className)}>
      <h2
        id={`${id}-heading`}
        className="font-heading text-lg font-semibold tracking-tight"
      >
        {heading}
      </h2>
      {children}
    </section>
  );
}

/** Body text of a legal page. */
export function LegalText({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
      {children}
    </p>
  );
}

/** Bullet list inside a legal page. */
export function LegalList({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
      {children}
    </ul>
  );
}
