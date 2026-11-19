import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  try {
    return navigator.onLine;
  } catch {
    // No navigator (exotic environments): assume online rather than lying
    // to the user with an offline bar.
    return true;
  }
}

/**
 * Whether the device currently reports a network connection, as external
 * state: `navigator.onLine` re-read on the window "online" and "offline"
 * events. No polling, no Capacitor plugin — the Android WebView fires
 * both events when the network changes.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
