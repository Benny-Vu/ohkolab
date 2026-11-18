import { beforeEach, describe, expect, it } from "vitest";

import {
  getTelemetryConsent,
  setTelemetryEnabled,
} from "@/lib/telemetry/consent";

function setBrowserSignals(gpc: boolean | undefined, dnt: string): void {
  Object.defineProperty(navigator, "globalPrivacyControl", {
    value: gpc,
    configurable: true,
  });
  Object.defineProperty(navigator, "doNotTrack", {
    value: dnt,
    configurable: true,
  });
}

describe("telemetry consent", () => {
  beforeEach(() => {
    localStorage.clear();
    setBrowserSignals(undefined, "unspecified");
  });

  it("is on by default", () => {
    const consent = getTelemetryConsent();
    expect(consent.enabled).toBe(true);
    expect(consent.analytics).toBe(true);
    expect(consent.crashes).toBe(true);
  });

  it("turns everything off through the switch", () => {
    setTelemetryEnabled(false);
    const consent = getTelemetryConsent();
    expect(consent.enabled).toBe(false);
    expect(consent.analytics).toBe(false);
    expect(consent.crashes).toBe(false);
    expect(localStorage.getItem("ohkolab:telemetry")).toBe("off");
  });

  it("persists the choice", () => {
    setTelemetryEnabled(false);
    expect(getTelemetryConsent().enabled).toBe(false);
    setTelemetryEnabled(true);
    expect(getTelemetryConsent().enabled).toBe(true);
    expect(localStorage.getItem("ohkolab:telemetry")).toBe("on");
  });

  it("opts out of analytics when Global Privacy Control is set", () => {
    setBrowserSignals(true, "unspecified");
    const consent = getTelemetryConsent();
    expect(consent.enabled).toBe(true);
    expect(consent.analytics).toBe(false);
    expect(consent.crashes).toBe(true);
  });

  it("opts out of analytics when Do Not Track is set", () => {
    setBrowserSignals(undefined, "1");
    const consent = getTelemetryConsent();
    expect(consent.enabled).toBe(true);
    expect(consent.analytics).toBe(false);
    expect(consent.crashes).toBe(true);
  });

  it("lets the switch win over browser signals", () => {
    setBrowserSignals(true, "1");
    setTelemetryEnabled(false);
    const consent = getTelemetryConsent();
    expect(consent.enabled).toBe(false);
    expect(consent.analytics).toBe(false);
    expect(consent.crashes).toBe(false);
  });
});
