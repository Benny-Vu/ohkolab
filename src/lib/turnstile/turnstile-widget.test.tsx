import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "@/lib/i18n/locale";
import { resetTurnstileLoadForTests } from "@/lib/turnstile/script";
import type { TurnstileRenderOptions } from "@/lib/turnstile/types";
import { TurnstileWidget } from "@/lib/turnstile/turnstile-widget";
import { setTheme } from "@/lib/theme";

afterEach(() => {
  cleanup();
  resetTurnstileLoadForTests();
  vi.unstubAllGlobals();
  // Back to the defaults for the next test.
  setTheme("dark");
  setLocale("en");
  localStorage.clear();
});

/** A fake `window.turnstile` that keeps every rendered widget's options. */
function stubTurnstile() {
  const handles: TurnstileRenderOptions[] = [];
  const reset = vi.fn();
  const remove = vi.fn();
  vi.stubGlobal("turnstile", {
    render: vi.fn(
      (_container: HTMLElement, options: TurnstileRenderOptions) => {
        handles.push(options);
        return `widget-${handles.length}`;
      },
    ),
    reset,
    remove,
  });
  return { handles, reset, remove };
}

/** The options of the first rendered widget (the one under test). */
function firstHandle(turnstile: ReturnType<typeof stubTurnstile>) {
  const handle = turnstile.handles[0];
  if (!handle) throw new Error("the widget has not rendered yet");
  return handle;
}

/** The (lazily injected) script tag, however the load is going. */
function turnstileScript(): HTMLScriptElement | null {
  return document.querySelector("script[data-ohkolab-turnstile]");
}

/** Makes the pending script load fail, as a blocked network would. */
function failTheLoad(): void {
  turnstileScript()?.dispatchEvent(new Event("error"));
}

describe("TurnstileWidget", () => {
  it("renders explicitly with the site key, app theme and language", async () => {
    const turnstile = stubTurnstile();
    render(
      <TurnstileWidget
        siteKey="site-key-x"
        onToken={vi.fn()}
        onFailed={vi.fn()}
      />,
    );

    await waitFor(() => expect(turnstile.handles).toHaveLength(1));
    expect(firstHandle(turnstile)).toMatchObject({
      sitekey: "site-key-x",
      theme: "dark",
      language: "en",
    });
  });

  it("delivers the solved token and clears it when it expires", async () => {
    const turnstile = stubTurnstile();
    const onToken = vi.fn();
    const onFailed = vi.fn();
    render(
      <TurnstileWidget
        siteKey="site-key-x"
        onToken={onToken}
        onFailed={onFailed}
      />,
    );
    await waitFor(() => expect(turnstile.handles).toHaveLength(1));

    firstHandle(turnstile).callback?.("token-123");
    expect(onToken).toHaveBeenLastCalledWith("token-123");
    expect(onFailed).toHaveBeenLastCalledWith(false);

    firstHandle(turnstile)["expired-callback"]?.();
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it("clears the token and reports failure when the widget errors", async () => {
    const turnstile = stubTurnstile();
    const onToken = vi.fn();
    const onFailed = vi.fn();
    render(
      <TurnstileWidget
        siteKey="site-key-x"
        onToken={onToken}
        onFailed={onFailed}
      />,
    );
    await waitFor(() => expect(turnstile.handles).toHaveLength(1));

    firstHandle(turnstile)["error-callback"]?.("bad-input");
    expect(onToken).toHaveBeenLastCalledWith(null);
    expect(onFailed).toHaveBeenLastCalledWith(true);
  });

  it("follows the app's theme and language by re-rendering the widget", async () => {
    const turnstile = stubTurnstile();
    render(
      <TurnstileWidget
        siteKey="site-key-x"
        onToken={vi.fn()}
        onFailed={vi.fn()}
      />,
    );
    await waitFor(() => expect(turnstile.handles).toHaveLength(1));

    setTheme("light");
    setLocale("ja");

    await waitFor(() => expect(turnstile.handles).toHaveLength(2));
    const second = turnstile.handles[1];
    if (!second) throw new Error("the re-rendered widget is missing");
    expect(second).toMatchObject({
      sitekey: "site-key-x",
      theme: "light",
      language: "ja",
    });
    // The old widget is removed, not left behind.
    expect(turnstile.remove).toHaveBeenCalledWith("widget-1");
  });

  it("restarts the challenge for a fresh token when resetKey is bumped", async () => {
    const turnstile = stubTurnstile();
    const onToken = vi.fn();
    const view = render(
      <TurnstileWidget
        siteKey="site-key-x"
        onToken={onToken}
        onFailed={vi.fn()}
      />,
    );
    await waitFor(() => expect(turnstile.handles).toHaveLength(1));
    firstHandle(turnstile).callback?.("token-123");
    expect(onToken).toHaveBeenLastCalledWith("token-123");

    view.rerender(
      <TurnstileWidget
        siteKey="site-key-x"
        onToken={onToken}
        onFailed={vi.fn()}
        resetKey={1}
      />,
    );

    expect(turnstile.reset).toHaveBeenCalledWith("widget-1");
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it("removes the widget and clears the token on unmount", async () => {
    const turnstile = stubTurnstile();
    const onToken = vi.fn();
    const view = render(
      <TurnstileWidget
        siteKey="site-key-x"
        onToken={onToken}
        onFailed={vi.fn()}
      />,
    );
    await waitFor(() => expect(turnstile.handles).toHaveLength(1));

    view.unmount();

    expect(turnstile.remove).toHaveBeenCalledWith("widget-1");
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it("reports failure and no token when the script cannot be loaded", async () => {
    const onToken = vi.fn();
    const onFailed = vi.fn();
    render(
      <TurnstileWidget
        siteKey="site-key-x"
        onToken={onToken}
        onFailed={onFailed}
      />,
    );

    failTheLoad();

    await waitFor(() => expect(onFailed).toHaveBeenCalledWith(true));
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it("re-attempts the whole load when a retry arrives with no widget", async () => {
    const onFailed = vi.fn();
    const view = render(
      <TurnstileWidget
        siteKey="site-key-x"
        onToken={vi.fn()}
        onFailed={onFailed}
      />,
    );
    failTheLoad();
    await waitFor(() => expect(onFailed).toHaveBeenCalledWith(true));
    // The broken script tag is gone.
    expect(turnstileScript()).toBeNull();

    // The network recovers: window.turnstile exists from now on.
    const turnstile = stubTurnstile();
    view.rerender(
      <TurnstileWidget
        siteKey="site-key-x"
        onToken={vi.fn()}
        onFailed={onFailed}
        resetKey={1}
      />,
    );

    await waitFor(() => expect(turnstile.handles).toHaveLength(1));
    // The failure from the broken load is never repeated: the re-render
    // says nothing more about it.
    expect(onFailed).toHaveBeenCalledTimes(1);
  });

  it("never reports failure once a challenge has solved", async () => {
    const turnstile = stubTurnstile();
    const onFailed = vi.fn();
    render(
      <TurnstileWidget
        siteKey="site-key-x"
        onToken={vi.fn()}
        onFailed={onFailed}
      />,
    );
    await waitFor(() => expect(turnstile.handles).toHaveLength(1));

    firstHandle(turnstile).callback?.("token-123");

    expect(onFailed).not.toHaveBeenCalledWith(true);
    expect(onFailed).toHaveBeenLastCalledWith(false);
  });

  it("keeps the container while the script is still loading", () => {
    const { container } = render(
      <TurnstileWidget
        siteKey="site-key-x"
        onToken={vi.fn()}
        onFailed={vi.fn()}
      />,
    );
    expect(container.firstElementChild).not.toBeNull();
  });
});
