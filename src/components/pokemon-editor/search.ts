/** Text search used by the pickers. Pure logic, no React. */

/** Lower-cases and drops accents and everything but letters and digits. */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Keywords only count once the query is long enough to mean something. */
const MIN_KEYWORD_QUERY = 3;

/**
 * How well a name matches a query: 0 when the name starts with it, 1 when a
 * later word starts with it, 2 when it appears anywhere in the name, 3 when
 * only a keyword (a type, a description...) contains it, -1 for no match.
 * An empty query matches everything with rank 0.
 */
export function matchRank(
  name: string,
  query: string,
  keywords: readonly string[] = [],
): number {
  const needle = normalizeSearch(query);
  if (needle === "") return 0;

  if (normalizeSearch(name).startsWith(needle)) return 0;
  const words = name.split(/[\s-]+/);
  for (let index = 1; index < words.length; index++) {
    if (normalizeSearch(words.slice(index).join(" ")).startsWith(needle)) {
      return 1;
    }
  }
  if (normalizeSearch(name).includes(needle)) return 2;

  if (needle.length >= MIN_KEYWORD_QUERY) {
    for (const keyword of keywords) {
      if (normalizeSearch(keyword).includes(needle)) return 3;
    }
  }
  return -1;
}

/**
 * The options matching a query, best matches first. Options that match
 * equally well keep their original order.
 */
export function searchOptions<T>(
  options: readonly T[],
  query: string,
  getName: (option: T) => string,
  getKeywords?: (option: T) => readonly string[],
): readonly T[] {
  if (normalizeSearch(query) === "") return options;

  const ranked: { option: T; rank: number }[] = [];
  for (const option of options) {
    const rank = matchRank(getName(option), query, getKeywords?.(option));
    if (rank >= 0) ranked.push({ option, rank });
  }
  // Array.prototype.sort is stable, so equal ranks stay in list order.
  ranked.sort((a, b) => a.rank - b.rank);
  return ranked.map((entry) => entry.option);
}
