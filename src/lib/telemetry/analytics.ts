import type { CaptureResult, PostHog } from "posthog-js";

import { getTelemetryConfig } from "@/lib/telemetry/config";
import { getTelemetryConsent } from "@/lib/telemetry/consent";
import type {
  EventProps,
  SharedEventProps,
  TelemetryEvent,
} from "@/lib/telemetry/events";
import { routeTemplate } from "@/lib/telemetry/route-template";

/**
 * Anonymous, cookieless usage statistics through PostHog. The SDK loads
 * lazily after first idle, never in the entry chunk; events queue until it
 * is ready. No autocapture, no identify(), no cookies.
 */

type QueuedEvent = {
  event: string;
  properties: Record<string, unknown>;
};

let posthog: PostHog | null = null;
let loading = false;
const queue: QueuedEvent[] = [];

function sharedProps(): SharedEventProps {
  const config = getTelemetryConfig();
  const width = window.innerWidth;
  const screenSize =
    width < 640 ? "phone" : width < 1024 ? "tablet" : "desktop";
  return {
    app_version: config.appVersion ?? "unknown",
    platform: "web",
    screen_size: screenSize,
  };
}

function analyticsAllowed(): boolean {
  const config = getTelemetryConfig();
  if (!config.analyticsEnabled) {
    return false;
  }
  return getTelemetryConsent().analytics;
}

/**
 * Strips the real URL from every event. posthog-js adds `$current_url`,
 * `$pathname`, `$host`, `$referrer`, `$referring_domain` and `$initial_*`
 * properties itself; this replaces them with the route template so tokens
 * in query strings or hashes and usernames in paths are never sent.
 */
function sanitizeCaptureResult(cr: CaptureResult): CaptureResult {
  const properties = { ...cr.properties };
  const template = routeTemplate(window.location.pathname);
  properties.$current_url = `${window.location.origin}${template}`;
  properties.$pathname = template;
  if (typeof properties.$referrer === "string") {
    properties.$referrer = stripUrlQueryAndHash(properties.$referrer);
  }
  for (const key of Object.keys(properties)) {
    if (key.startsWith("$initial_")) {
      delete properties[key];
    }
  }
  return { ...cr, properties };
}

function stripUrlQueryAndHash(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    const withoutHash = url.split("#")[0] ?? url;
    return withoutHash.split("?")[0] ?? withoutHash;
  }
}

function flushQueue(): void {
  if (!posthog) {
    return;
  }
  for (const queued of queue.splice(0)) {
    posthog.capture(queued.event, queued.properties);
  }
}

function loadPostHog(): void {
  if (loading || posthog) {
    return;
  }
  loading = true;
  void import("posthog-js")
    .then((module) => {
      const config = getTelemetryConfig();
      const client = module.posthog;
      client.init(config.posthogKey ?? "", {
        api_host: config.posthogHost ?? "https://eu.i.posthog.com",
        persistence: "memory",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        disable_web_experiments: true,
        before_send: sanitizeCaptureResult,
      });
      posthog = client;
      flushQueue();
    })
    .catch(() => {
      loading = false;
    });
}

function scheduleLoad(): void {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => {
      loadPostHog();
    });
  } else {
    window.setTimeout(loadPostHog, 200);
  }
}

let loadScheduled = false;

function ensureLoaded(): void {
  if (!loadScheduled) {
    loadScheduled = true;
    scheduleLoad();
  }
}

function capture(event: string, properties: Record<string, unknown>): void {
  if (!analyticsAllowed()) {
    return;
  }
  ensureLoaded();
  if (posthog) {
    posthog.capture(event, properties);
  } else {
    queue.push({ event, properties });
  }
}

/** Records a catalogue event with its properties. */
export function track<E extends TelemetryEvent>(
  event: E,
  ...args: EventProps<E> extends Record<string, never> ? [] : [EventProps<E>]
): void {
  const props = args.length > 0 ? (args[0] as Record<string, unknown>) : {};
  capture(event, { ...props, ...sharedProps() });
}

/**
 * Records a page view as PostHog's standard `$pageview` event, with
 * `$current_url` set to the route template so the built-in Web analytics
 * dashboard works and the real URL is never sent.
 */
export function trackPageView(pathname: string): void {
  capture("$pageview", {
    $current_url: routeTemplate(pathname),
    ...sharedProps(),
  });
}
