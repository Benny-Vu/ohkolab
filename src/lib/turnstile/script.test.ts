import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  TURNSTILE_SCRIPT_URL,
  loadTurnstile,
  resetTurnstileLoadForTests,
} from "@/lib/turnstile/script";
import type { TurnstileApi } from "@/lib/turnstile/types";

function injectedScripts(): HTMLScriptElement[] {
  return [
    ...document.querySelectorAll<HTMLScriptElement>(
      "script[data-ohkolab-turnstile]",
    ),
  ];
}

function theScript(): HTMLScriptElement {
  const script = injectedScripts()[0];
  if (!script) throw new Error("the Turnstile script was not injected");
  return script;
}

function stubTurnstileApi(): TurnstileApi {
  return { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };
}

beforeEach(() => {
  resetTurnstileLoadForTests();
  for (const script of injectedScripts()) script.remove();
});

afterEach(() => {
  resetTurnstileLoadForTests();
  for (const script of injectedScripts()) script.remove();
  vi.unstubAllGlobals();
});

describe("loadTurnstile", () => {
  it("resolves without injecting anything when the API is already there", async () => {
    vi.stubGlobal("turnstile", stubTurnstileApi());

    await expect(loadTurnstile()).resolves.toBeUndefined();
    expect(injectedScripts()).toHaveLength(0);
  });

  it("injects the script once, with explicit rendering, and resolves on load", async () => {
    const loading = loadTurnstile();

    const script = theScript();
    expect(script.getAttribute("src")).toBe(
      `${TURNSTILE_SCRIPT_URL}?render=explicit`,
    );
    expect(script.async).toBe(true);

    // A concurrent caller shares the same load instead of adding a tag.
    const shared = loadTurnstile();
    expect(injectedScripts()).toHaveLength(1);

    vi.stubGlobal("turnstile", stubTurnstileApi());
    script.dispatchEvent(new Event("load"));

    await expect(loading).resolves.toBeUndefined();
    await expect(shared).resolves.toBeUndefined();
  });

  it("rejects when the script fails and lets the next caller retry", async () => {
    const failed = loadTurnstile();
    theScript().dispatchEvent(new Event("error"));
    await expect(failed).rejects.toThrow(
      "Cloudflare Turnstile could not be loaded.",
    );

    // The broken tag is gone, so a retry starts fresh.
    expect(injectedScripts()).toHaveLength(0);
    const retried = loadTurnstile();
    theScript().dispatchEvent(new Event("load"));
    await expect(retried).resolves.toBeUndefined();
  });
});
