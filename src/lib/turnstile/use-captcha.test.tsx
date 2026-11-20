import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetTurnstileLoadForTests } from "@/lib/turnstile/script";
import type { CaptchaState } from "@/lib/turnstile/use-captcha";
import { useCaptcha } from "@/lib/turnstile/use-captcha";

afterEach(() => {
  cleanup();
  resetTurnstileLoadForTests();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function widgetProps(state: CaptchaState) {
  const widget = state.widget as ReactElement<{
    onToken: (token: string | null) => void;
  }>;
  return widget.props;
}

describe("useCaptcha", () => {
  it("stays inert without a site key", () => {
    const { result } = renderHook(() => useCaptcha());

    expect(result.current.enabled).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.missing).toBe(false);
    expect(result.current.widget).toBeNull();
  });

  it("holds the submit back until the widget delivers a token", () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-x");
    vi.stubGlobal("turnstile", {
      render: vi.fn(() => "widget-1"),
      reset: vi.fn(),
      remove: vi.fn(),
    });
    const { result } = renderHook(() => useCaptcha());

    expect(result.current.enabled).toBe(true);
    expect(result.current.missing).toBe(true);
    expect(result.current.widget).not.toBeNull();

    act(() => widgetProps(result.current).onToken("token-123"));
    expect(result.current.token).toBe("token-123");
    expect(result.current.missing).toBe(false);
  });

  it("drops the token and demands a fresh one on retry", () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-x");
    vi.stubGlobal("turnstile", {
      render: vi.fn(() => "widget-1"),
      reset: vi.fn(),
      remove: vi.fn(),
    });
    const { result } = renderHook(() => useCaptcha());
    act(() => widgetProps(result.current).onToken("token-123"));

    act(() => result.current.retry());

    expect(result.current.token).toBeNull();
    expect(result.current.missing).toBe(true);
  });
});
