import * as Sentry from "@sentry/react";

import { getTelemetryConfig } from "@/lib/telemetry/config";
import { getTelemetryConsent } from "@/lib/telemetry/consent";
import { routeTemplate } from "@/lib/telemetry/route-template";
import { describeSocialError } from "@/lib/social/errors";

/**
 * Crash reporting through Sentry. No tracing, no replay, no session data:
 * only the error, the route template and the app version leave the browser.
 */

/** True for the failures `describeSocialError` maps to expected codes. */
export function isExpectedError(error: unknown): boolean {
  return describeSocialError(error).code !== "unknown";
}

const NOISE_PATTERNS: ReadonlyArray<RegExp> = [
  /ResizeObserver loop/i,
  /ResizeObserver loop completed with undelivered notifications/i,
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /aborted/i,
];

function isNoise(event: Sentry.Event): boolean {
  const values = event.exception?.values;
  if (!values) {
    return false;
  }
  return values.some((value) => {
    // Sentry wraps some errors as { type: "Error", value: "ResizeObserver
    // loop..." }; test both fields so the type never masks the message.
    const fields = [value.type ?? "", value.value ?? ""];
    return fields.some((field) =>
      NOISE_PATTERNS.some((pattern) => pattern.test(field)),
    );
  });
}

/** Groups repeated errors per session so one flapping error cannot flood Sentry. */
const seenThisSession = new Set<string>();

function isRepeated(event: Sentry.Event): boolean {
  const values = event.exception?.values;
  const first = values?.[0];
  if (!first) {
    return false;
  }
  const key = `${first.type ?? ""}:${first.value ?? ""}`;
  if (seenThisSession.has(key)) {
    return true;
  }
  seenThisSession.add(key);
  return false;
}

function scrubUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url, window.location.origin);
    return `${parsed.origin}${routeTemplate(parsed.pathname)}`;
  } catch {
    return routeTemplate(url);
  }
}

function scrubBreadcrumbs(event: Sentry.Event): void {
  const breadcrumbs = event.breadcrumbs;
  if (!breadcrumbs) {
    return;
  }
  event.breadcrumbs = breadcrumbs.flatMap((crumb) => {
    if (crumb.category === "console") {
      // Console output can hold arbitrary user data; drop it entirely.
      return [];
    }
    if (crumb.category === "fetch" || crumb.category === "xhr") {
      const data = crumb.data as Record<string, unknown> | undefined;
      const url = typeof data?.url === "string" ? data.url : undefined;
      if (!url) {
        return [crumb];
      }
      const scrubbed: Record<string, unknown> = {
        url: scrubRequestUrl(url),
      };
      if (typeof data?.method === "string") {
        scrubbed.method = data.method;
      }
      if (typeof data?.status_code === "number") {
        scrubbed.status_code = data.status_code;
      }
      return [{ ...crumb, data: scrubbed }];
    }
    if (crumb.category === "navigation" && typeof crumb.data?.to === "string") {
      return [
        {
          ...crumb,
          data: { to: routeTemplate(crumb.data.to) },
        },
      ];
    }
    return [crumb];
  });
}

/**
 * Keeps a request URL's origin and path but drops the query string and
 * hash, which hold filters, ids and search text. App-origin paths become
 * route templates; other origins (Supabase REST) keep their real path.
 */
function scrubRequestUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path =
      parsed.origin === window.location.origin
        ? routeTemplate(parsed.pathname)
        : parsed.pathname;
    return `${parsed.origin}${path}`;
  } catch {
    return routeTemplate(url);
  }
}

function scrubRequest(event: Sentry.Event): void {
  const request = event.request;
  if (!request) {
    return;
  }
  if (typeof request.url === "string") {
    request.url = scrubUrl(request.url);
  }
  if (request.headers) {
    delete request.headers.Cookie;
    delete request.headers.cookie;
    delete request.headers.Authorization;
    delete request.headers.authorization;
  }
  if (request.cookies) {
    delete request.cookies;
  }
}

function scrubEvent(event: Sentry.Event): Sentry.Event {
  scrubRequest(event);
  scrubBreadcrumbs(event);
  if (event.user) {
    // Keep only the stable id; never email, username or IP.
    event.user = { id: event.user.id };
  }
  return event;
}

/** Initializes Sentry when crash reporting is enabled; a no-op otherwise. */
export function initSentry(): void {
  const config = getTelemetryConfig();
  if (!config.crashEnabled) {
    return;
  }
  const consent = getTelemetryConsent();
  if (!consent.crashes) {
    return;
  }
  Sentry.init({
    dsn: config.sentryDsn ?? undefined,
    release: config.appVersion ?? undefined,
    tracesSampleRate: 0,
    environment: config.telemetryEnabled ? "production" : "development",
    beforeSend: (event) => {
      // Consent may have been withdrawn after start-up; check it on every event.
      if (!getTelemetryConsent().crashes) {
        return null;
      }
      if (isNoise(event) || isRepeated(event)) {
        return null;
      }
      return scrubEvent(event) as typeof event;
    },
  });
}

/** Reports an error to Sentry and returns the event id, or null when off. */
export function reportError(
  error: unknown,
  context?: Record<string, string>,
): string | null {
  const config = getTelemetryConfig();
  if (!config.crashEnabled) {
    return null;
  }
  const consent = getTelemetryConsent();
  if (!consent.crashes) {
    return null;
  }
  if (isExpectedError(error)) {
    return null;
  }
  return Sentry.captureException(error, (scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setContext(key, { value });
      }
    }
    return scope;
  });
}
