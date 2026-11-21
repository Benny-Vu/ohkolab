import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "@/lib/use-media-query";

/** jsdom's matchMedia stand-in matches nothing; this one fires changes. */
function fakeMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches,
    media: "",
    onchange: null,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  const spy = vi
    .spyOn(window, "matchMedia")
    .mockReturnValue(mql as unknown as MediaQueryList);
  return {
    spy,
    flip(next: boolean) {
      mql.matches = next;
      for (const fn of listeners) fn();
    },
  };
}

describe("useMediaQuery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports the current match", () => {
    fakeMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
  });

  it("defaults to false before the first snapshot", () => {
    fakeMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
  });

  it("re-renders when the match changes", () => {
    const media = fakeMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);

    act(() => media.flip(true));
    expect(result.current).toBe(true);

    act(() => media.flip(false));
    expect(result.current).toBe(false);
  });
});
