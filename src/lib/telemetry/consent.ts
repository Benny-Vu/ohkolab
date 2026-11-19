import { useSyncExternalStore } from "react";

/**
 * Telemetry consent: an opt-out switch stored in localStorage, plus the
 * browser's Global Privacy Control and Do Not Track signals. GPC and DNT
 * opt out of anonymous usage statistics; crash reports are only controlled
 * by the switch.
 */

const CONSENT_KEY = "ohkolab:telemetry";

export interface TelemetryConsent {
  /** The opt-out switch: true when the user shares usage data and crash reports. */
  enabled: boolean;
  /** Anonymous usage statistics may be sent (switch on, no GPC/DNT signal). */
  analytics: boolean;
  /** Crash reports may be sent (switch on). */
  crashes: boolean;
}

const DEFAULT_CONSENT: TelemetryConsent = {
  enabled: true,
  analytics: true,
  crashes: true,
};

const listeners = new Set<() => void>();

let cached: { key: string; consent: TelemetryConsent } | undefined;

function readOptedOut(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "off";
  } catch {
    return false;
  }
}

function browserOptsOutOfTracking(): boolean {
  const withGpc = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (withGpc.globalPrivacyControl === true) {
    return true;
  }
  const dnt = navigator.doNotTrack;
  return dnt === "1" || dnt === "yes";
}

function computeConsent(
  optedOut: boolean,
  browserOptOut: boolean,
): TelemetryConsent {
  return {
    enabled: !optedOut,
    analytics: !optedOut && !browserOptOut,
    crashes: !optedOut,
  };
}

/** The current consent state; the object is stable until the state changes. */
export function getTelemetryConsent(): TelemetryConsent {
  const optedOut = readOptedOut();
  const browserOptOut = browserOptsOutOfTracking();
  const key = `${optedOut ? "0" : "1"}${browserOptOut ? "0" : "1"}`;
  if (cached === undefined || cached.key !== key) {
    cached = { key, consent: computeConsent(optedOut, browserOptOut) };
  }
  return cached.consent;
}

/** Turns the opt-out switch on or off and persists the choice. */
export function setTelemetryEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, enabled ? "on" : "off");
  } catch {
    // Ignore storage failures; the cached state still updates.
  }
  cached = undefined;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * A non-React subscription to consent changes (used by the native crash
 * reporter to stop itself when consent is withdrawn mid-session).
 */
export function onTelemetryConsentChange(callback: () => void): () => void {
  return subscribe(callback);
}

/** React hook for the telemetry consent state. */
export function useTelemetryConsent(): TelemetryConsent {
  return useSyncExternalStore(
    subscribe,
    getTelemetryConsent,
    () => DEFAULT_CONSENT,
  );
}
