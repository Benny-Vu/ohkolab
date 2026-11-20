/**
 * Pure discovery logic for the Groups page: filtering the public directory
 * by search term, category and language, and sorting it by member count
 * (Popular) or creation date (New). The queries fetch the directory once;
 * these functions run client side, which is fine at this scale.
 */

import type { DiscoverGroup, GroupSummary } from "@/lib/groups/queries";
import type { GroupCategory, GroupLanguage } from "@/lib/groups/validation";

/** How the Discover list is ordered. */
export type DiscoverSort = "popular" | "new";

/** What the Discover list is filtered by. Null means "no filter". */
export interface DiscoverFilters {
  search: string;
  category: GroupCategory | null;
  language: GroupLanguage | null;
}

/**
 * Keeps the groups whose name or address contains the search term
 * (case-insensitive) and that match the category and language filters.
 */
export function filterDiscoverGroups<T extends GroupSummary>(
  groups: T[],
  filters: DiscoverFilters,
): T[] {
  const term = filters.search.trim().toLowerCase();
  return groups.filter((group) => {
    if (
      term.length > 0 &&
      !group.name.toLowerCase().includes(term) &&
      !group.slug.toLowerCase().includes(term)
    ) {
      return false;
    }
    if (filters.category !== null && group.category !== filters.category) {
      return false;
    }
    if (filters.language !== null && group.language !== filters.language) {
      return false;
    }
    return true;
  });
}

/**
 * Orders the directory: by member count (Popular) or by creation date
 * (New). Ties fall back to the name so the order is stable.
 */
export function sortDiscoverGroups<T extends DiscoverGroup>(
  groups: T[],
  sort: DiscoverSort,
): T[] {
  const ordered = [...groups];
  if (sort === "popular") {
    ordered.sort(
      (a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name),
    );
  } else {
    ordered.sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name),
    );
  }
  return ordered;
}
