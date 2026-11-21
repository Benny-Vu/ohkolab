import { useCallback, useSyncExternalStore } from "react";

/**
 * True while the viewport matches a CSS media query. The server snapshot
 * (and jsdom's stand-in, which matches nothing) is false, so phone layout
 * is the safe default for the first paint.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
