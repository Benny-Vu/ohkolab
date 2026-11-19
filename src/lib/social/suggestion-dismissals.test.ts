import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  dismissedSuggestionsKey,
  DISMISSED_SUGGESTIONS_PREFIX,
  readDismissedSuggestions,
  writeDismissedSuggestion,
} from "@/lib/social/suggestion-dismissals";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("dismissed suggestions storage", () => {
  it("builds a per-user storage key", () => {
    expect(dismissedSuggestionsKey("user-1")).toBe(
      `${DISMISSED_SUGGESTIONS_PREFIX}user-1`,
    );
    expect(dismissedSuggestionsKey("user-2")).not.toBe(
      dismissedSuggestionsKey("user-1"),
    );
  });

  it("reads an empty list when nothing was dismissed", () => {
    expect(readDismissedSuggestions(dismissedSuggestionsKey("user-1"))).toEqual(
      [],
    );
  });

  it("writes and reads back dismissals", () => {
    const key = dismissedSuggestionsKey("user-1");
    writeDismissedSuggestion(key, "user-2");
    writeDismissedSuggestion(key, "user-3");

    expect(readDismissedSuggestions(key)).toEqual(["user-2", "user-3"]);
  });

  it("never records the same id twice", () => {
    const key = dismissedSuggestionsKey("user-1");
    writeDismissedSuggestion(key, "user-2");
    writeDismissedSuggestion(key, "user-2");

    expect(readDismissedSuggestions(key)).toEqual(["user-2"]);
  });

  it("keeps the lists of two users apart", () => {
    writeDismissedSuggestion(dismissedSuggestionsKey("user-1"), "user-2");
    writeDismissedSuggestion(dismissedSuggestionsKey("user-9"), "user-3");

    expect(readDismissedSuggestions(dismissedSuggestionsKey("user-1"))).toEqual(
      ["user-2"],
    );
    expect(readDismissedSuggestions(dismissedSuggestionsKey("user-9"))).toEqual(
      ["user-3"],
    );
  });

  it("ignores unreadable or malformed storage", () => {
    const key = dismissedSuggestionsKey("user-1");
    localStorage.setItem(key, "not json");
    expect(readDismissedSuggestions(key)).toEqual([]);

    localStorage.setItem(key, JSON.stringify({ no: "array" }));
    expect(readDismissedSuggestions(key)).toEqual([]);

    localStorage.setItem(key, JSON.stringify(["user-2", 42, null, "user-3"]));
    expect(readDismissedSuggestions(key)).toEqual(["user-2", "user-3"]);
  });
});
