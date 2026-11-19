import * as Sentry from "@sentry/react";
import * as CapacitorSentry from "@sentry/capacitor";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  overrideTelemetryConfig,
  type TelemetryConfig,
} from "@/lib/telemetry/config";
import { setTelemetryEnabled } from "@/lib/telemetry/consent";
import {
  initSentry,
  isExpectedError,
  reportError,
  stopNativeSentry,
} from "@/lib/telemetry/sentry";

vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  captureException: vi.fn(() => "event-1"),
}));

vi.mock("@sentry/capacitor", () => ({
  init: vi.fn(),
  close: vi.fn(),
  nativeCrash: vi.fn(),
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

describe("stopNativeSentry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    overrideTelemetryConfig(null);
  });

  it("is a no-op when nothing was initialized natively (the web)", () => {
    stopNativeSentry();
    expect(CapacitorSentry.close).not.toHaveBeenCalled();
  });
});

describe("initSentry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    overrideTelemetryConfig(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
    // Outside a native shell the platform tag is the web default.
    expect(options?.initialScope).toMatchObject({
      tags: { platform: "web" },
    });
  });

  it("in the native app, initializes through the capacitor SDK with the react sibling init", async () => {
    vi.stubGlobal("Capacitor", {
      getPlatform: () => "android",
      isNativePlatform: () => true,
    });
    overrideTelemetryConfig(ENABLED);
    initSentry();

    await vi.waitFor(() => {
      expect(CapacitorSentry.init).toHaveBeenCalledTimes(1);
    });
    // The plain web init must not also run (that would double-init).
    expect(Sentry.init).not.toHaveBeenCalled();

    const [call] = vi.mocked(CapacitorSentry.init).mock.calls;
    const options = call?.[0];
    const siblingInit = call?.[1];
    expect(options?.dsn).toBe(ENABLED.sentryDsn);
    expect(options?.release).toBe("1.2.3");
    expect(typeof options?.beforeSend).toBe("function");
    expect(options?.initialScope).toMatchObject({
      tags: { platform: "android" },
    });
    expect(siblingInit).toBe(Sentry.init);
  });

  it("in the native app, closes the native SDK when consent is withdrawn", async () => {
    vi.stubGlobal("Capacitor", {
      getPlatform: () => "android",
      isNativePlatform: () => true,
    });
    overrideTelemetryConfig(ENABLED);
    initSentry();

    await vi.waitFor(() => {
      expect(CapacitorSentry.init).toHaveBeenCalledTimes(1);
    });
    setTelemetryEnabled(false);

    await vi.waitFor(() => {
      expect(CapacitorSentry.close).toHaveBeenCalled();
    });
    localStorage.clear();
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

describe("beforeSend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    overrideTelemetryConfig(null);
  });

  function getBeforeSend(): (
    event: Sentry.Event,
    hint: unknown,
  ) => Sentry.Event | null {
    overrideTelemetryConfig(ENABLED);
    initSentry();
    const beforeSend = vi.mocked(Sentry.init).mock.calls[0]?.[0]?.beforeSend;
    if (typeof beforeSend !== "function") {
      throw new Error("beforeSend was not captured");
    }
    return beforeSend as unknown as (
      event: Sentry.Event,
      hint: unknown,
    ) => Sentry.Event | null;
  }

  it("returns null when consent was withdrawn after start-up", () => {
    const beforeSend = getBeforeSend();
    localStorage.setItem("ohkolab:telemetry", "off");
    const result = beforeSend({ event_id: "e-consent" } as Sentry.Event, {});
    expect(result).toBeNull();
  });

  it("filters ResizeObserver noise wrapped as { type: 'Error' }", () => {
    const beforeSend = getBeforeSend();
    const event = {
      event_id: "e-noise",
      exception: {
        values: [
          {
            type: "Error",
            value:
              "ResizeObserver loop completed with undelivered notifications",
          },
        ],
      },
    } as Sentry.Event;
    expect(beforeSend(event, {})).toBeNull();
  });

  it("keeps a real error that is neither noise nor repeated", () => {
    const beforeSend = getBeforeSend();
    const event = {
      event_id: "e-real",
      exception: {
        values: [{ type: "TypeError", value: "unique crash 8f3k2" }],
      },
    } as Sentry.Event;
    const result = beforeSend(event, {});
    expect(result).not.toBeNull();
    expect(result?.exception?.values?.[0]?.value).toBe("unique crash 8f3k2");
  });
});

describe("scrubBreadcrumbs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    overrideTelemetryConfig(null);
  });

  function getBeforeSend(): (
    event: Sentry.Event,
    hint: unknown,
  ) => Sentry.Event | null {
    overrideTelemetryConfig(ENABLED);
    initSentry();
    const beforeSend = vi.mocked(Sentry.init).mock.calls[0]?.[0]?.beforeSend;
    if (typeof beforeSend !== "function") {
      throw new Error("beforeSend was not captured");
    }
    return beforeSend as unknown as (
      event: Sentry.Event,
      hint: unknown,
    ) => Sentry.Event | null;
  }

  it("drops the query string from fetch breadcrumbs", () => {
    const beforeSend = getBeforeSend();
    const event = {
      event_id: "e-fetch",
      breadcrumbs: [
        {
          category: "fetch",
          data: {
            url: `https://ohkolab.supabase.co/rest/v1/profiles?username=eq.alice&select=*`,
            method: "GET",
            status_code: 200,
          },
        },
      ],
    } as unknown as Sentry.Event;
    const result = beforeSend(event, {});
    const crumb = result?.breadcrumbs?.[0];
    expect(crumb?.data).toEqual({
      url: "https://ohkolab.supabase.co/rest/v1/profiles",
      method: "GET",
      status_code: 200,
    });
    expect(JSON.stringify(crumb?.data)).not.toContain("alice");
  });

  it("templates app-origin request URLs", () => {
    const beforeSend = getBeforeSend();
    const event = {
      event_id: "e-app-fetch",
      breadcrumbs: [
        {
          category: "fetch",
          data: {
            url: `${window.location.origin}/u/alice?tab=teams`,
            method: "GET",
            status_code: 200,
          },
        },
      ],
    } as unknown as Sentry.Event;
    const result = beforeSend(event, {});
    const crumb = result?.breadcrumbs?.[0];
    expect(crumb?.data).toEqual({
      url: `${window.location.origin}/u/:username`,
      method: "GET",
      status_code: 200,
    });
  });

  it("drops console breadcrumbs entirely", () => {
    const beforeSend = getBeforeSend();
    const event = {
      event_id: "e-console",
      breadcrumbs: [
        {
          category: "console",
          data: { arguments: ["user alice said something private"] },
        },
      ],
    } as unknown as Sentry.Event;
    const result = beforeSend(event, {});
    expect(result?.breadcrumbs).toEqual([]);
  });

  it("still templates navigation breadcrumbs", () => {
    const beforeSend = getBeforeSend();
    const event = {
      event_id: "e-nav",
      breadcrumbs: [
        {
          category: "navigation",
          data: { to: "/u/alice" },
        },
      ],
    } as unknown as Sentry.Event;
    const result = beforeSend(event, {});
    expect(result?.breadcrumbs?.[0]?.data).toEqual({ to: "/u/:username" });
  });
});
