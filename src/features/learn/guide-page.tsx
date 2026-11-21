import { Link, useParams } from "react-router";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonSmTouchClass } from "@/components/touch-targets";

import {
  findLearnEntry,
  findLearnSection,
  localized,
  localizedBody,
} from "@/features/learn/guides";
import { GuidePager, LearnFrame } from "@/features/learn/learn-frame";
import { LearnExample } from "@/features/learn/learn-example";
import { NotFoundPage } from "@/features/system/not-found-page";
import { useLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";

/**
 * A guide page (/learn/<slug>): breadcrumb, the body, the live example
 * when the entry asks for one, a link into the tools, and previous/next
 * within its section — compact outline buttons, never content cards.
 */
export function GuidePage() {
  const { slug } = useParams();
  const [locale] = useLocale();
  const t = useT();
  const entry = slug ? findLearnEntry(slug) : undefined;

  // Unknown slugs and short entries (they live on their section page)
  // are misses; registry pages answer to no other shape.
  if (!entry || !entry.long) {
    return <NotFoundPage />;
  }

  const section = findLearnSection(entry.section);
  const calcLabel =
    entry.calcLink === "/calc/battle"
      ? t("learn.openBattleMode")
      : t("learn.tryInCalc");

  return (
    <LearnFrame section={entry.section}>
      <article className="grid gap-3">
        <nav aria-label="Breadcrumb" className="text-sm">
          <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
            <li>
              <Link
                to="/learn"
                className="rounded-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {t("learn.title")}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link
                to={`/learn/${entry.section}`}
                className="rounded-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {section ? localized(section.title, locale) : entry.section}
              </Link>
            </li>
          </ol>
        </nav>

        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          {localized(entry.title, locale)}
        </h1>

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

        {entry.example ? <LearnExample kind={entry.example} /> : null}

        {entry.calcLink ? (
          // The one call to action on a guide: a real button (owner sketch),
          // full width on phones, hugging its label from sm up.
          <Button
            asChild
            className={`mt-1 w-full sm:w-auto sm:justify-self-start ${buttonSmTouchClass}`}
          >
            <Link to={entry.calcLink}>
              {calcLabel}
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
        ) : null}

        <GuidePager section={entry.section} slug={entry.slug} />
      </article>
    </LearnFrame>
  );
}
