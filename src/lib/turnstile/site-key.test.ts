import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getTurnstileSiteKey,
  isTurnstileEnabled,
} from "@/lib/turnstile/site-key";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getTurnstileSiteKey", () => {
  it("is empty, and Turnstile off, without the env var", () => {
    expect(getTurnstileSiteKey()).toBe("");
    expect(isTurnstileEnabled()).toBe(false);
  });

  it("returns the configured site key", () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-x");
    expect(getTurnstileSiteKey()).toBe("site-key-x");
    expect(isTurnstileEnabled()).toBe(true);
  });

  it("treats a blank key as off", () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "   ");
    expect(getTurnstileSiteKey()).toBe("");
    expect(isTurnstileEnabled()).toBe(false);
  });
});
