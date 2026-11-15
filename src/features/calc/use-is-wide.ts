import { useSyncExternalStore } from "react";

/** From this width up the calculator shows every panel at once. */
const WIDE_QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True on screens wide enough for the side-by-side layout. */
export function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}
