/**
 * The learn registry: every explainer, vocabulary term and field guide in
 * one typed list, the same pattern as the changelog entries. An entry's
 * content lives here (EN and JA inline), not in JSX, so a new explainer is
 * one entry and never layout work.
 *
 * The `long` flag decides the shape: a long entry gets its own page at
 * `/learn/<slug>` (summary row plus "Read" on the section page); a short
 * entry shows its full text on the section page (a toggle row on phones,
 * a full card on desktop). Vocabulary terms are short entries whose slug
 * is also their deep-link anchor.
 */

import { registerRouteMetaProvider } from "@/app/page-title";
import { getLocale } from "@/lib/i18n/locale";

/** A string with an English and a Japanese twin. */
export interface LocalizedText {
  en: string;
  ja: string;
}

/** Paragraphs of body text, per locale. */
export interface LocalizedBody {
  en: string[];
  ja: string[];
}

/** The four sections of the learn hub. */
export type LearnSectionId = "vocabulary" | "concepts" | "types" | "field";

/** One registry entry. */
export interface LearnEntry {
  /** The URL slug (guide pages) or deep-link anchor (vocabulary). */
  slug: string;
  section: LearnSectionId;
  title: LocalizedText;
  /** One line: the summary on rows, the hub card's description. */
  summary: LocalizedText;
  /** Own page (`/learn/<slug>`) or full text in place on the section page. */
  long: boolean;
  /** The entry's text. Long entries: the guide page body. Short: full text. */
  body: LocalizedBody;
  /** The live example block shown under the body, when one applies. */
  example?: "damage-rolls";
  /** Where the "Try it in the calc" link goes, when it applies. */
  calcLink?: "/calc" | "/calc/battle";
  /**
   * Vocabulary terms only: the slug of the entry this term links to. A
   * long target links to its page; a short one to its anchor on its
   * section page.
   */
  guide?: string;
}

/** Section chrome for the hub cards, tabs and the title provider. */
export interface LearnSectionInfo {
  id: LearnSectionId;
  /** Hub card and tab title. */
  title: LocalizedText;
  /** The hub card's one-line description. */
  description: LocalizedText;
  /** The hub card's count, when the section is not registry-driven. */
  countOverride?: number;
}

/** The four sections, in hub-card order. */
export const LEARN_SECTIONS: readonly LearnSectionInfo[] = [
  {
    id: "vocabulary",
    title: { en: "Vocabulary", ja: "用語" },
    description: {
      en: "What VGC players mean when they say OHKO, pivot or lead.",
      ja: "OHKO、起点、先発など、VGCプレイヤーが使う言葉の意味。",
    },
  },
  {
    id: "concepts",
    title: { en: "Concepts", ja: "バトルの仕組み" },
    description: {
      en: "How battles work, from team preview to damage rolls.",
      ja: "チームプレビューから乱数まで、チャンピオンズのバトルの仕組み。",
    },
  },
  {
    id: "types",
    title: { en: "Types", ja: "タイプ" },
    description: {
      en: "The type chart, and what each type resists or brings.",
      ja: "タイプ相性表と、各タイプの特徴。",
    },
    // The type cards are not registry entries; the hub still counts them.
    countOverride: 18,
  },
  {
    id: "field",
    title: { en: "Field conditions", ja: "フィールド状態" },
    description: {
      en: "Weather, terrain, screens and the other field effects.",
      ja: "天候、フィールド、壁など、場に関わる効果。",
    },
  },
];

import { conceptEntries } from "@/features/learn/content/concepts";
import { fieldEntries } from "@/features/learn/content/field";
import { vocabularyEntries } from "@/features/learn/content/vocabulary";

/** Every entry, sections in hub order then registry order inside. */
export const LEARN_ENTRIES: readonly LearnEntry[] = [
  ...vocabularyEntries,
  ...conceptEntries,
  ...fieldEntries,
];

/** The entries of one section, in registry order. */
export function entriesForSection(
  section: LearnSectionId,
): readonly LearnEntry[] {
  return LEARN_ENTRIES.filter((entry) => entry.section === section);
}

/** The entry with a slug, or undefined (unknown slugs 404). */
export function findLearnEntry(slug: string): LearnEntry | undefined {
  return LEARN_ENTRIES.find((entry) => entry.slug === slug);
}

/** The section with an id, or undefined. */
export function findLearnSection(id: string): LearnSectionInfo | undefined {
  return LEARN_SECTIONS.find((section) => section.id === id);
}

/** The count the hub card shows for a section. */
export function sectionEntryCount(section: LearnSectionId): number {
  return (
    findLearnSection(section)?.countOverride ??
    entriesForSection(section).length
  );
}

/** The long entries of a section — the ones with their own pages. */
export function guideEntriesForSection(
  section: LearnSectionId,
): readonly LearnEntry[] {
  return entriesForSection(section).filter((entry) => entry.long);
}

/** The text of an entry in one locale, with the English fallback. */
export function localized(text: LocalizedText, locale: string): string {
  return locale === "ja" ? text.ja : text.en;
}

/** The paragraphs of a body in one locale, with the English fallback. */
export function localizedBody(
  body: LocalizedBody,
  locale: string,
): readonly string[] {
  return locale === "ja" ? body.ja : body.en;
}

// Route metadata: registering here means every learn chunk (each page
// imports the registry) and the search palette wire the tab titles and
// meta descriptions without copying anything into shell dictionary keys.
// The hub keeps its shell entry ("Learn"); everything below resolves here.
registerRouteMetaProvider((pathname: string) => {
  const match = /^\/learn\/([^/]+)$/.exec(pathname);
  if (!match) return undefined;
  const part = decodeURIComponent(match[1] ?? "");
  const locale = getLocale();

  // Section pages: /learn/vocabulary, /learn/concepts, /learn/types…
  const section = findLearnSection(part);
  if (section) {
    return {
      title: localized(section.title, locale),
      description: localized(section.description, locale),
    };
  }

  // Guide pages: /learn/damage-rolls and its siblings.
  const entry = findLearnEntry(part);
  if (!entry) return undefined;
  return {
    title: localized(entry.title, locale),
    description: localized(entry.summary, locale),
  };
});
