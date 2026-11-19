import { useSyncExternalStore } from "react";

import { isNativeApp } from "@/lib/platform";

// ---------------------------------------------------------------------------
// Web: navigator.onLine re-read on the window "online" and "offline" events.
// ---------------------------------------------------------------------------

function subscribeWeb(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getWebSnapshot(): boolean {
  try {
    return navigator.onLine;
  } catch {
    // No navigator (exotic environments): assume online rather than lying
    // to the user with an offline bar.
    return true;
  }
}

// ---------------------------------------------------------------------------
// Native: @capacitor/network. The Android WebView's navigator.onLine stays
// true even with wifi and data off (verified on the emulator), so in the
// app the plugin is the only reliable source. The plugin module is loaded
// dynamically behind isNativeApp(), keeping it out of the web bundle.
// ---------------------------------------------------------------------------

let nativeOnline = true;
let nativeStarted = false;
const nativeListeners = new Set<() => void>();

function notifyNative(): void {
  for (const listener of nativeListeners) listener();
}

/** Starts the plugin once: listener first, then the current status. */
async function startNativeNetwork(): Promise<void> {
  const { Network } = await import("@capacitor/network");
  await Network.addListener("networkStatusChange", (status) => {
    nativeOnline = status.connected;
    notifyNative();
  });
  const status = await Network.getStatus();
  nativeOnline = status.connected;
  notifyNative();
}

function subscribeNative(callback: () => void): () => void {
  if (!nativeStarted) {
    nativeStarted = true;
    void startNativeNetwork();
  }
  nativeListeners.add(callback);
  return () => {
    nativeListeners.delete(callback);
  };
}

function getNativeSnapshot(): boolean {
  return nativeOnline;
}

/**
 * Whether the device currently reports a network connection, as external
 * state. On the web that is `navigator.onLine` plus the window events; in
 * the native apps it comes from the @capacitor/network plugin (status on
 * start and change listener), because the WebView's `navigator.onLine`
 * does not track connectivity there. No polling either way.
 */
export function useOnlineStatus(): boolean {
  // The platform never changes within a session, so the store functions are
  // picked up front — but the hook itself is always called the same way.
  const subscribe = isNativeApp() ? subscribeNative : subscribeWeb;
  const getSnapshot = isNativeApp() ? getNativeSnapshot : getWebSnapshot;
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
