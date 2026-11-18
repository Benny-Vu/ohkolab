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
