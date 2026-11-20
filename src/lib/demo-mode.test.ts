import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { initDemoMode, isDemoMode } from "@/lib/demo-mode";

describe("demo mode", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
    window.sessionStorage.clear();
  });

  it("stays off without the query parameter", () => {
    window.history.replaceState({}, "", "/");
    initDemoMode();
    expect(isDemoMode()).toBe(false);
  });

  it("ignores other values than 1", () => {
    window.history.replaceState({}, "", "/?demo=0");
    initDemoMode();
    expect(isDemoMode()).toBe(false);
  });

  it("turns on with ?demo=1", () => {
    window.history.replaceState({}, "", "/?demo=1");
    initDemoMode();
    expect(isDemoMode()).toBe(true);
  });

  it("stays on for the session, after the URL is gone", () => {
    window.history.replaceState({}, "", "/?demo=1");
    initDemoMode();
    window.history.replaceState({}, "", "/");
    expect(isDemoMode()).toBe(true);
  });

  it("is per tab session: a fresh session starts off", () => {
    // jsdom shares sessionStorage per test file; clearing simulates the
    // fresh tab the next visitor opens.
    window.sessionStorage.clear();
    expect(isDemoMode()).toBe(false);
  });
});
