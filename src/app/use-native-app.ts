import { useEffect } from "react";
import { useNavigate } from "react-router";

import { isNativeApp } from "@/lib/platform";

/**
 * Mounts the native app glue (back button, status bar, external links,
 * splash, and — behind VITE_PUSH — push notifications) once the app shell
 * has rendered. On the web the check fails and the glue module is never even
 * loaded, so the ohkolab.com bundles stay exactly as they were. The router's
 * navigate is handed in so a notification tap can deep-link in-app.
 */
export function useNativeApp(): void {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void import("@/lib/native/shell").then(
      (shell) =>
        void shell.mountNativeShell({ navigate }).then((mounted) => {
          if (cancelled) mounted();
          else dispose = mounted;
        }),
    );
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [navigate]);
}
