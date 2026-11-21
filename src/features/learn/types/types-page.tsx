import { findLearnSection, localized } from "@/features/learn/guides";
import { LearnFrame } from "@/features/learn/learn-frame";
import { useLocale } from "@/lib/i18n/locale";

/**
 * PLACEHOLDER — the types stream replaces this file. It owns
 * `src/features/learn/types/**`: the 18 type cards (attacking, defending,
 * traits), the sidebar of the 18 types plus "Type chart", and the chart
 * itself, per the learn brief's "Types page layout" spec.
 */
export function TypesPage() {
  const [locale] = useLocale();
  const info = findLearnSection("types");
  return (
    <LearnFrame section="types">
      <article className="grid gap-3">
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          {info ? localized(info.title, locale) : "Types"}
        </h1>
      </article>
    </LearnFrame>
  );
}
