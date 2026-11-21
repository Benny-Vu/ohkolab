import { describe, expect, it, vi } from "vitest";

import { createPacedFetch, RateLimitedError } from "./fetch.ts";

// No test here touches the real API: fetch, the clock and sleep are all
// mocks. The fake clock advances only when sleep "runs", so the pacing the
// tests assert on is exactly what the real client waits.

interface Harness {
  requestCount: () => number;
  sleeps: () => number[];
  /** Advances the fake clock without sleeping. */
  advance: (ms: number) => void;
}

function makeHarness(
  handler: (url: string, request: number) => Response | Promise<Response>,
  options: { spacingMs?: number; remainingMargin?: number } = {},
): { client: ReturnType<typeof createPacedFetch>; harness: Harness } {
  let clock = 1_000_000;
  const sleeps: number[] = [];
  const request = vi.fn(async (url: string) => {
    requestCount += 1;
    return handler(url, requestCount);
  });
  let requestCount = 0;
  const client = createPacedFetch(
    {
      fetchFn: request,
      now: () => clock,
      sleep: async (ms: number) => {
        sleeps.push(ms);
        clock += ms;
      },
    },
    options,
  );
  return {
    client,
    harness: {
      requestCount: () => requestCount,
      sleeps: () => sleeps,
      advance: (ms: number) => {
        clock += ms;
      },
    },
  };
}

function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("createPacedFetch", () => {
  it("waits a full second between requests", async () => {
    const { client, harness } = makeHarness((url, n) => json(200, { n }));
    await client.getJson("https://api.test/a");
    await client.getJson("https://api.test/b");
    expect(harness.requestCount()).toBe(2);
    // The first request has nothing to wait for; the second waits out the
    // full spacing gap (the fake clock only moves when sleep runs).
    expect(harness.sleeps()).toEqual([1000]);
  });

  it("does not sleep again when the spacing has already elapsed", async () => {
    const { client, harness } = makeHarness((url, n) => json(200, { n }));
    await client.getJson("https://api.test/a");
    harness.advance(1500);
    await client.getJson("https://api.test/b");
    expect(harness.sleeps()).toEqual([]);
  });

  it("stops at once on a 429 and never retries", async () => {
    const { client, harness } = makeHarness(() =>
      json(429, { error: "rate limited" }, { "retry-after": "120" }),
    );
    await expect(client.getJson("https://api.test/a")).rejects.toBeInstanceOf(
      RateLimitedError,
    );
    expect(harness.requestCount()).toBe(1);
  });

  it("waits out the window when the RateLimit header runs low", async () => {
    const { client, harness } = makeHarness((url, n) =>
      json(200, { n }, { ratelimit: '"50-in-5min"; r=1; t=300' }),
    );
    await client.getJson("https://api.test/a");
    await client.getJson("https://api.test/b");
    // The second request must have waited the full 300-second window reset.
    expect(harness.sleeps()).toContain(300_000);
  });

  it("does not wait when enough requests remain", async () => {
    const { client, harness } = makeHarness((url, n) =>
      json(200, { n }, { ratelimit: '"50-in-5min"; r=49; t=300' }),
    );
    await client.getJson("https://api.test/a");
    await client.getJson("https://api.test/b");
    expect(harness.sleeps()).not.toContain(300_000);
  });

  it("retries a failed request exactly once, then succeeds", async () => {
    const { client, harness } = makeHarness((url, n) =>
      n === 1 ? json(500, { error: "boom" }) : json(200, { ok: true }),
    );
    await expect(client.getJson("https://api.test/a")).resolves.toEqual({
      ok: true,
    });
    expect(harness.requestCount()).toBe(2);
  });

  it("gives up after one retry", async () => {
    const { client, harness } = makeHarness(() => json(503, { error: "down" }));
    await expect(client.getJson("https://api.test/a")).rejects.toThrow(
      /after one retry/,
    );
    expect(harness.requestCount()).toBe(2);
  });

  it("retries a network error once, then gives up", async () => {
    const { client, harness } = makeHarness(() => {
      throw new Error("ECONNRESET");
    });
    await expect(client.getJson("https://api.test/a")).rejects.toThrow(
      /failed twice/,
    );
    expect(harness.requestCount()).toBe(2);
  });
});
