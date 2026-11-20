import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
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
  // The widget node wraps the TurnstileWidget (plus its failure message
  // when one is showing); the widget is always the first child.
  const wrapper = state.widget as ReactElement<{ children: ReactNode }>;
  const children = wrapper.props.children;
  const widget = (Array.isArray(children) ? children[0] : children) as {
    props: {
      onToken: (token: string | null) => void;
      onFailed: (failed: boolean) => void;
    };
  };
  return widget.props;
}

/** Renders only the captcha's own UI, for the message and retry tests. */
function CaptchaProbe() {
  const captcha = useCaptcha();
  return <>{captcha.widget}</>;
}

/** The lazily injected Turnstile script tag, however the load is going. */
function turnstileScript(): HTMLScriptElement | null {
  return document.querySelector("script[data-ohkolab-turnstile]");
}

describe("useCaptcha", () => {
  it("stays inert without a site key", () => {
    const { result } = renderHook(() => useCaptcha());

    expect(result.current.enabled).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.missing).toBe(false);
    expect(result.current.failed).toBe(false);
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

  it("tracks failure and clears it when the retry sets out", () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-x");
    vi.stubGlobal("turnstile", {
      render: vi.fn(() => "widget-1"),
      reset: vi.fn(),
      remove: vi.fn(),
    });
    const { result } = renderHook(() => useCaptcha());

    act(() => widgetProps(result.current).onFailed(true));
    expect(result.current.failed).toBe(true);
    expect(result.current.missing).toBe(true);

    act(() => result.current.retry());
    expect(result.current.failed).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it("explains a load failure and retries the load from the message", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-x");
    render(<CaptchaProbe />);

    // No window.turnstile: the script tag never loads. Fail it.
    expect(turnstileScript()).not.toBeNull();
    act(() => {
      turnstileScript()?.dispatchEvent(new Event("error"));
    });

    // The silent empty box is explained, with a retry at hand.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/security check couldn't load/i);
    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry).toBeVisible();

    // Retry clears the message and sets out to load the script again:
    // a fresh script tag appears where the broken one was removed.
    act(() => {
      retry.click();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(turnstileScript()).not.toBeNull();

    // Still fail-closed: no token, so a form submit stays held.
    const { result } = renderHook(() => useCaptcha());
    expect(result.current.missing).toBe(true);
  });

  it("explains a widget error the same way", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-x");
    vi.stubGlobal("turnstile", {
      render: vi.fn((_container: HTMLElement, options: object) => {
        (options as { "error-callback"?: () => void })["error-callback"]?.();
        return "widget-1";
      }),
      reset: vi.fn(),
      remove: vi.fn(),
    });
    render(<CaptchaProbe />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/security check couldn't load/i);
  });
});
