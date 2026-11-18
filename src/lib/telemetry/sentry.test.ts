import * as Sentry from "@sentry/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  overrideTelemetryConfig,
  type TelemetryConfig,
} from "@/lib/telemetry/config";
import {
  initSentry,
  isExpectedError,
  reportError,
} from "@/lib/telemetry/sentry";

vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  captureException: vi.fn(() => "event-1"),
}));

const ENABLED: TelemetryConfig = {
  sentryDsn: "https://abc123@example.com/1",
  posthogKey: null,
  posthogHost: null,
  appVersion: "1.2.3",
  telemetryEnabled: true,
  crashEnabled: true,
  analyticsEnabled: false,
};

describe("initSentry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    overrideTelemetryConfig(null);
  });

  it("does not initialize when the DSN is missing", () => {
    overrideTelemetryConfig({
      ...ENABLED,
      sentryDsn: null,
      crashEnabled: false,
    });
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("does not initialize when the user opted out", () => {
    localStorage.setItem("ohkolab:telemetry", "off");
    overrideTelemetryConfig(ENABLED);
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("initializes with no tracing and scrubbing enabled", () => {
    overrideTelemetryConfig(ENABLED);
    initSentry();
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const options = vi.mocked(Sentry.init).mock.calls[0]?.[0];
    expect(options?.tracesSampleRate).toBe(0);
    expect(options?.dsn).toBe(ENABLED.sentryDsn);
    expect(options?.release).toBe("1.2.3");
    expect(typeof options?.beforeSend).toBe("function");
  });
});

describe("reportError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    overrideTelemetryConfig(null);
  });

  it("returns null when crash reporting is off", () => {
    overrideTelemetryConfig({ ...ENABLED, crashEnabled: false });
    expect(reportError(new Error("boom"))).toBeNull();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("returns the Sentry event id", () => {
    overrideTelemetryConfig(ENABLED);
    expect(reportError(new Error("boom"))).toBe("event-1");
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it("does not report expected social errors", () => {
    overrideTelemetryConfig(ENABLED);
    const rateLimited = Object.assign(new Error("rate limited"), {
      code: "P0A06",
    });
    expect(reportError(rateLimited)).toBeNull();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("isExpectedError", () => {
  it("returns true for errors describeSocialError maps to expected codes", () => {
    const rateLimited = Object.assign(new Error("too many"), {
      code: "P0A06",
    });
    expect(isExpectedError(rateLimited)).toBe(true);
    const notFound = Object.assign(new Error("missing"), {
      code: "PGRST116",
    });
    expect(isExpectedError(notFound)).toBe(true);
  });

  it("returns false for unknown errors", () => {
    expect(isExpectedError(new Error("something broke"))).toBe(false);
    expect(isExpectedError("not even an error")).toBe(false);
  });
});
