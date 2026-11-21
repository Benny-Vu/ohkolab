// The paced fetch client for the Limitless API. The real ingest passes
// globalThis fetch and the real clock; the tests pass mocks, so no test
// ever touches the API. Politeness: at least one second between requests,
// the RateLimit response header is honoured, a 429 stops the run at once,
// and a failed request gets exactly one retry before the run gives up.

import { REMAINING_MARGIN, REQUEST_SPACING_MS } from "./config.ts";

/** Thrown on HTTP 429: the run must stop with the snapshot untouched. */
export class RateLimitedError extends Error {
  readonly retryAfter: string | null;

  constructor(url: string, retryAfter: string | null) {
    super(`Rate limited (HTTP 429) on ${url}`);
    this.name = "RateLimitedError";
    this.retryAfter = retryAfter;
  }
}

export interface PacedFetchDeps {
  fetchFn: typeof fetch;
  /** Milliseconds since the epoch; injectable for tests. */
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

export interface PacedFetchOptions {
  /** Minimum gap between requests. Default 1000. */
  spacingMs?: number;
  /** Wait for the window to reset when at most this many requests remain. */
  remainingMargin?: number;
}

// The API sends `RateLimit: "50-in-5min"; r=49; t=300`, where r is the
// requests remaining in the window and t the seconds until it resets.
const REMAINING_PATTERN = /(?:^|;)\s*r=(\d+)/;
const RESET_PATTERN = /(?:^|;)\s*t=(\d+)/;

function parseRateLimit(header: string | null): {
  remaining: number | null;
  resetSeconds: number | null;
} {
  if (!header) return { remaining: null, resetSeconds: null };
  const remaining = REMAINING_PATTERN.exec(header);
  const reset = RESET_PATTERN.exec(header);
  return {
    remaining: remaining ? Number(remaining[1]) : null,
    resetSeconds: reset ? Number(reset[1]) : null,
  };
}

export interface PacedFetch {
  /**
   * GETs the URL and returns the parsed JSON body. Throws RateLimitedError
   * on 429 (no retry) and Error after a failed request has been retried
   * once.
   */
  getJson(url: string): Promise<unknown>;
}

export function createPacedFetch(
  deps: PacedFetchDeps,
  options: PacedFetchOptions = {},
): PacedFetch {
  const spacingMs = options.spacingMs ?? REQUEST_SPACING_MS;
  const remainingMargin = options.remainingMargin ?? REMAINING_MARGIN;

  let lastRequestAt = -Infinity;
  let windowResetsAt = -Infinity;

  const waitBeforeNextRequest = async (): Promise<void> => {
    const readyAt = Math.max(lastRequestAt + spacingMs, windowResetsAt);
    const wait = readyAt - deps.now();
    if (wait > 0) await deps.sleep(wait);
  };

  return {
    async getJson(url: string): Promise<unknown> {
      // A request that failed (non-OK or network error) gets one retry;
      // a 429 is politeness' hard stop and is never retried.
      for (let attempt = 0; attempt < 2; attempt++) {
        await waitBeforeNextRequest();
        let response: Response;
        try {
          response = await deps.fetchFn(url);
        } catch (error) {
          lastRequestAt = deps.now();
          if (attempt > 0) {
            throw new Error(
              `Request failed twice on ${url}: ${
                error instanceof Error ? error.message : String(error)
              }`,
              { cause: error },
            );
          }
          continue;
        }
        lastRequestAt = deps.now();
        const rate = parseRateLimit(
          response.headers?.get?.("ratelimit") ?? null,
        );
        if (response.status === 429) {
          throw new RateLimitedError(
            url,
            response.headers?.get?.("retry-after") ?? null,
          );
        }
        if (rate.remaining !== null && rate.remaining <= remainingMargin) {
          const resetMs = (rate.resetSeconds ?? 0) * 1000;
          if (resetMs > 0) windowResetsAt = deps.now() + resetMs;
        }
        if (!response.ok) {
          if (attempt > 0) {
            throw new Error(
              `HTTP ${response.status} on ${url} (after one retry)`,
            );
          }
          continue;
        }
        return (await response.json()) as unknown;
      }
      // Unreachable: the loop returns or throws.
      throw new Error(`Request failed on ${url}`);
    },
  };
}
