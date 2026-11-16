import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AUTH_CALLBACK_PATH,
  DEFAULT_RETURN_PATH,
  RESET_PASSWORD_PATH,
  consumeReturnTo,
  getAuthCallbackUrl,
  rememberReturnTo,
  sanitizeReturnTo,
} from "@/lib/auth/redirects";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("sanitizeReturnTo", () => {
  it("keeps in-app paths, with their query and hash", () => {
    expect(sanitizeReturnTo("/")).toBe("/");
    expect(sanitizeReturnTo("/teams")).toBe("/teams");
    expect(sanitizeReturnTo("/teams?slot=1")).toBe("/teams?slot=1");
    expect(sanitizeReturnTo("/teams#garchomp")).toBe("/teams#garchomp");
  });

  it("falls back to the default for anything that is not a site path", () => {
    expect(sanitizeReturnTo(undefined)).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnTo(null)).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnTo(42)).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnTo("")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnTo("teams")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnTo("https://evil.example.com")).toBe(
      DEFAULT_RETURN_PATH,
    );
    expect(sanitizeReturnTo("//evil.example.com")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnTo("/\\evil.example.com")).toBe(DEFAULT_RETURN_PATH);
  });

  it("falls back to the default for control characters", () => {
    expect(sanitizeReturnTo("/teams\n")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnTo("/\x00")).toBe(DEFAULT_RETURN_PATH);
  });

  it("never returns to the auth pages", () => {
    expect(sanitizeReturnTo("/login")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnTo("/login?returnTo=/teams")).toBe(
      DEFAULT_RETURN_PATH,
    );
    expect(sanitizeReturnTo("/login/anything")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnTo("/auth/callback")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnTo("/auth/callback?code=x")).toBe(DEFAULT_RETURN_PATH);
  });

  it("keeps paths that merely start like an auth page", () => {
    expect(sanitizeReturnTo("/logins")).toBe("/logins");
    expect(sanitizeReturnTo("/author")).toBe("/author");
  });
});

describe("getAuthCallbackUrl", () => {
  it("points at the callback path on this origin", () => {
    expect(getAuthCallbackUrl()).toBe(
      `${window.location.origin}${AUTH_CALLBACK_PATH}`,
    );
  });
});

describe("rememberReturnTo and consumeReturnTo", () => {
  it("round-trips a return target", () => {
    rememberReturnTo("/teams?slot=1");
    expect(consumeReturnTo()).toBe("/teams?slot=1");
  });

  it("consumes the target only once", () => {
    rememberReturnTo("/teams");
    expect(consumeReturnTo()).toBe("/teams");
    expect(consumeReturnTo()).toBe(DEFAULT_RETURN_PATH);
  });

  it("defaults when nothing was remembered", () => {
    expect(consumeReturnTo()).toBe(DEFAULT_RETURN_PATH);
  });

  it("sanitizes what it reads back", () => {
    rememberReturnTo("https://evil.example.com");
    expect(consumeReturnTo()).toBe(DEFAULT_RETURN_PATH);
  });

  it("falls back to the default when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    rememberReturnTo("/teams");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(consumeReturnTo()).toBe(DEFAULT_RETURN_PATH);
  });
});

describe("RESET_PASSWORD_PATH", () => {
  it("is an in-app path", () => {
    expect(RESET_PASSWORD_PATH).toBe("/reset-password");
  });
});
