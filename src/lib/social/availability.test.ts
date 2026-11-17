import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { AppSupabaseClient } from "@/lib/supabase";
import {
  describeWriteError,
  isSocialNotInstalled,
  markSocialNotInstalled,
  resetSocialInstallState,
  socialAvailability,
  softReadError,
} from "@/lib/social/availability";

const fakeClient = {} as AppSupabaseClient;

beforeEach(() => {
  resetSocialInstallState();
});

afterEach(() => {
  resetSocialInstallState();
});

describe("socialAvailability", () => {
  it("reports not-configured without a client", () => {
    expect(socialAvailability(null)).toBe("not-configured");
  });

  it("reports ready with a client while the tables are expected", () => {
    expect(socialAvailability(fakeClient)).toBe("ready");
  });

  it("reports not-installed once the missing tables have been seen", () => {
    markSocialNotInstalled();
    expect(socialAvailability(fakeClient)).toBe("not-installed");
  });

  it("prefers the not-installed answer over not-configured", () => {
    markSocialNotInstalled();
    expect(socialAvailability(null)).toBe("not-installed");
  });

  it("forgets the cached answer after a reset", () => {
    markSocialNotInstalled();
    resetSocialInstallState();
    expect(isSocialNotInstalled()).toBe(false);
    expect(socialAvailability(fakeClient)).toBe("ready");
  });
});

describe("softReadError", () => {
  it("returns the empty value and caches not-installed for a missing relation", () => {
    expect(softReadError({ code: "42P01", message: "missing" }, [])).toEqual(
      [],
    );
    expect(isSocialNotInstalled()).toBe(true);
  });

  it("throws a mapped SocialFailure for other errors", () => {
    let thrown: unknown = null;
    try {
      softReadError({ code: "P0A01", message: "too many posts" }, []);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toEqual({
      code: "rate_limited",
      message: "You are posting too quickly. Wait a few minutes and try again.",
    });
    expect(isSocialNotInstalled()).toBe(false);
  });
});

describe("describeWriteError", () => {
  it("maps a missing relation to not_installed and caches it", () => {
    const failure = describeWriteError({
      code: "PGRST202",
      message: "missing",
    });
    expect(failure.code).toBe("not_installed");
    expect(isSocialNotInstalled()).toBe(true);
  });

  it("maps other write errors without caching", () => {
    const failure = describeWriteError({ code: "P0A03", message: "suspended" });
    expect(failure.code).toBe("suspended");
    expect(isSocialNotInstalled()).toBe(false);
  });
});
