import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SKELETON_DELAY_MS,
  useDelayedPending,
} from "@/components/skeletons/use-delayed-pending";

describe("useDelayedPending", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays false during the grace window, then turns true while pending", () => {
    const { result } = renderHook(() => useDelayedPending(true));

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(SKELETON_DELAY_MS - 1);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it("never shows for a load that finishes inside the window", () => {
    const { result, rerender } = renderHook(
      ({ pending }: { pending: boolean }) => useDelayedPending(pending),
      { initialProps: { pending: true } },
    );

    act(() => {
      vi.advanceTimersByTime(SKELETON_DELAY_MS / 2);
    });
    rerender({ pending: false });

    act(() => {
      vi.advanceTimersByTime(SKELETON_DELAY_MS * 2);
    });
    expect(result.current).toBe(false);
  });

  it("falls back to false immediately when pending ends after showing", () => {
    const { result, rerender } = renderHook(
      ({ pending }: { pending: boolean }) => useDelayedPending(pending),
      { initialProps: { pending: true } },
    );

    act(() => {
      vi.advanceTimersByTime(SKELETON_DELAY_MS);
    });
    expect(result.current).toBe(true);

    rerender({ pending: false });
    expect(result.current).toBe(false);
  });

  it("honours a custom delay", () => {
    const { result } = renderHook(() => useDelayedPending(true, 500));

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });
});
