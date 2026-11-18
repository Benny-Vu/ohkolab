import { useEffect } from "react";

import { isNativeApp } from "@/lib/platform";

/**
 * Mounts the native app glue (back button, status bar, external links,
 * splash) once the app shell has rendered. On the web the check fails and the
 * glue module is never even loaded, so the ohkolab.com bundles stay exactly
 * as they were.
 */
export function useNativeApp(): void {
  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void import("@/lib/native/shell").then(
      (shell) =>
        void shell.mountNativeShell().then((mounted) => {
          if (cancelled) mounted();
          else dispose = mounted;
        }),
    );
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);
}
