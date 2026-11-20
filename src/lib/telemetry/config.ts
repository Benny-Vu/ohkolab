/**
 * Telemetry configuration. Sentry and PostHog keys come from the environment;
 * telemetry stays off when keys are missing, in tests, and in development
 * unless VITE_TELEMETRY_IN_DEV=true.
 */

interface TelemetryEnv {
  MODE?: string;
  VITE_SENTRY_DSN?: string;
  VITE_POSTHOG_KEY?: string;
  VITE_POSTHOG_HOST?: string;
  VITE_APP_VERSION?: string;
  VITE_TELEMETRY_IN_DEV?: string;
}

export interface TelemetryConfig {
  sentryDsn: string | null;
  posthogKey: string | null;
  posthogHost: string | null;
  appVersion: string | null;
  /** True when telemetry may run at all (not tests, not dev unless opted in). */
  telemetryEnabled: boolean;
  /** True when crash reports may be sent to Sentry. */
  crashEnabled: boolean;
  /** True when anonymous usage statistics may be sent to PostHog. */
  analyticsEnabled: boolean;
}

const DISABLED: TelemetryConfig = {
  sentryDsn: null,
  posthogKey: null,
  posthogHost: null,
  appVersion: null,
  telemetryEnabled: false,
  crashEnabled: false,
  analyticsEnabled: false,
};

function readKey(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readTelemetryConfig(env: TelemetryEnv): TelemetryConfig {
  if (env.MODE === "test") {
    return DISABLED;
  }
  const sentryDsn = readKey(env.VITE_SENTRY_DSN);
  const posthogKey = readKey(env.VITE_POSTHOG_KEY);
  const posthogHost = readKey(env.VITE_POSTHOG_HOST);
  const appVersion = readKey(env.VITE_APP_VERSION);
  const keys = { sentryDsn, posthogKey, posthogHost, appVersion };

  const isDev = env.MODE === "development";
  if (isDev && env.VITE_TELEMETRY_IN_DEV !== "true") {
    return {
      ...keys,
      telemetryEnabled: false,
      crashEnabled: false,
      analyticsEnabled: false,
    };
  }

  return {
    ...keys,
    telemetryEnabled: true,
    crashEnabled: sentryDsn !== null,
    analyticsEnabled: posthogKey !== null,
  };
}

const telemetryConfig = readTelemetryConfig(import.meta.env);

let override: TelemetryConfig | null = null;

/** Replaces the environment-derived config; used by tests to enable telemetry. */
export function overrideTelemetryConfig(config: TelemetryConfig | null): void {
  override = config;
}

/** The active config: the test override when set, otherwise the environment. */
export function getTelemetryConfig(): TelemetryConfig {
  return override ?? telemetryConfig;
}
