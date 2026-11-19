/**
 * Dismissed follow suggestions, remembered per user in localStorage. Nothing
 * is stored server side: dismissing only hides the suggestion for this
 * browser. Every read and write is wrapped so a blocked or cleared store
 * (private window, storage quota) degrades to "nothing dismissed".
 */

/** The storage key prefix; the user id is appended per account. */
export const DISMISSED_SUGGESTIONS_PREFIX = "ohkolab:dismissed-suggestions:";

/** The storage key one user's dismissals live under. */
export function dismissedSuggestionsKey(userId: string): string {
  return `${DISMISSED_SUGGESTIONS_PREFIX}${userId}`;
}

/** The ids the user has dismissed, newest storage state as-is. */
export function readDismissedSuggestions(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

/** Records one dismissal. A full or blocked store is silently ignored. */
export function writeDismissedSuggestion(
  key: string,
  suggestionId: string,
): void {
  try {
    const ids = readDismissedSuggestions(key);
    if (!ids.includes(suggestionId)) {
      ids.push(suggestionId);
    }
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Nothing we can do; the dismissal just is not remembered.
  }
}
