import { beforeEach, describe, expect, it, vi } from "vitest";

import { track, trackPageView } from "@/lib/telemetry/analytics";
import {
  overrideTelemetryConfig,
  type TelemetryConfig,
} from "@/lib/telemetry/config";

const posthogMock = {
  init: vi.fn(),
  capture: vi.fn(),
};

// The analytics module loads the SDK only once per test file, and
// vi.clearAllMocks() wipes init's call history. Capture the options here so
// later tests can still read what init was called with.
const initOptions: { current?: Record<string, unknown> } = {};
posthogMock.init.mockImplementation(
  (_key: string, options?: Record<string, unknown>) => {
    initOptions.current = options;
  },
);

vi.mock("posthog-js", () => ({
  posthog: posthogMock,
}));
const ENABLED: TelemetryConfig = {
  sentryDsn: null,
  posthogKey: "phc-key",
  posthogHost: "https://eu.i.posthog.com",
  appVersion: "1.2.3",
  telemetryEnabled: true,
  crashEnabled: false,
  analyticsEnabled: true,
};

describe("track", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    overrideTelemetryConfig(null);
  });

  it("does nothing when analytics is off", () => {
    overrideTelemetryConfig({ ...ENABLED, analyticsEnabled: false });
    track("theme_changed", { theme: "dark" });
    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("does nothing when the user opted out", () => {
    localStorage.setItem("ohkolab:telemetry", "off");
    overrideTelemetryConfig(ENABLED);
    track("theme_changed", { theme: "dark" });
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("queues events until the SDK loads", async () => {
    overrideTelemetryConfig(ENABLED);
    track("theme_changed", { theme: "dark" });
    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(posthogMock.init).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(posthogMock.capture).toHaveBeenCalledWith(
        "theme_changed",
        expect.objectContaining({ theme: "dark" }),
      );
    });
  });

  it("adds shared properties to every event", async () => {
    overrideTelemetryConfig(ENABLED);
    track("feedback_sent", { kind: "bug" });
    await vi.waitFor(() => {
      expect(posthogMock.capture).toHaveBeenCalled();
    });
    const [, properties] = posthogMock.capture.mock.calls[0] ?? [];
    expect(properties).toMatchObject({
      app_version: "1.2.3",
      platform: "web",
      screen_size: expect.any(String),
    });
  });
});

describe("trackPageView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    overrideTelemetryConfig(null);
  });

  it("sends the standard $pageview event with the route template", async () => {
    overrideTelemetryConfig(ENABLED);
    trackPageView("/u/ashketchum");
    await vi.waitFor(() => {
      expect(posthogMock.capture).toHaveBeenCalled();
    });
    const [event, properties] = posthogMock.capture.mock.calls[0] ?? [];
    expect(event).toBe("$pageview");
    expect(properties).toMatchObject({
      $current_url: "/u/:username",
    });
  });

  it("never sends the real URL", async () => {
    overrideTelemetryConfig(ENABLED);
    trackPageView("/u/ashketchum?secret=1");
    await vi.waitFor(() => {
      expect(posthogMock.capture).toHaveBeenCalled();
    });
    const [, properties] = posthogMock.capture.mock.calls[0] ?? [];
    expect(JSON.stringify(properties)).not.toContain("ashketchum");
  });
});

describe("before_send sanitiser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    overrideTelemetryConfig(null);
  });

  async function getBeforeSend(): Promise<
    (cr: {
      properties: Record<string, unknown>;
    }) => { properties: Record<string, unknown> } | null
  > {
    overrideTelemetryConfig(ENABLED);
    track("theme_changed", { theme: "dark" });
    await vi.waitFor(() => {
      expect(initOptions.current).toBeDefined();
    });
    const beforeSend = initOptions.current?.before_send as
      | ((cr: {
          properties: Record<string, unknown>;
        }) => { properties: Record<string, unknown> } | null)
      | undefined;
    if (typeof beforeSend !== "function") {
      throw new Error("before_send was not set on init");
    }
    return beforeSend;
  }

  it("strips tokens from the auth callback URL", async () => {
    const beforeSend = await getBeforeSend();
    window.history.pushState(
      {},
      "",
      "/auth/callback#access_token=x&refresh_token=y",
    );
    const result = beforeSend({
      properties: {
        $current_url: window.location.href,
        $pathname: "/auth/callback",
        $host: window.location.host,
        $referrer: `${window.location.origin}/auth/callback#access_token=x`,
        $initial_current_url: `${window.location.origin}/auth/callback#access_token=x`,
        $initial_referrer: `${window.location.origin}/`,
        $initial_referring_domain: window.location.host,
      },
    });
    const serialized = JSON.stringify(result?.properties ?? {});
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("refresh_token");
    expect(serialized).not.toContain("#");
    expect(result?.properties.$current_url).toBe(
      `${window.location.origin}/auth/callback`,
    );
    expect(result?.properties.$pathname).toBe("/auth/callback");
  });

  it("replaces user paths with the route template", async () => {
    const beforeSend = await getBeforeSend();
    window.history.pushState({}, "", "/u/alice");
    const result = beforeSend({
      properties: {
        $current_url: window.location.href,
        $pathname: "/u/alice",
        $host: window.location.host,
        $referrer: "https://google.com/search?q=alice+profile",
        $initial_pathname: "/u/alice",
      },
    });
    const serialized = JSON.stringify(result?.properties ?? {});
    expect(serialized).not.toContain("alice");
    expect(result?.properties.$pathname).toBe("/u/:username");
    expect(result?.properties.$current_url).toBe(
      `${window.location.origin}/u/:username`,
    );
    expect(result?.properties.$referrer).toBe("https://google.com/search");
  });

  it("keeps non-URL properties untouched", async () => {
    const beforeSend = await getBeforeSend();
    window.history.pushState({}, "", "/");
    const result = beforeSend({
      properties: {
        theme: "dark",
        app_version: "1.2.3",
        $host: window.location.host,
      },
    });
    expect(result?.properties).toMatchObject({
      theme: "dark",
      app_version: "1.2.3",
    });
  });
});
