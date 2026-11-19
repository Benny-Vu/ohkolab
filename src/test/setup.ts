import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { loadJapaneseDictionary } from "@/lib/i18n/ja-loader";

// The Japanese dictionary loads lazily in production (its own chunk, with
// the English strings as the fallback). Tests assert Japanese text right
// away, so the setup loads it once before any test runs.
await loadJapaneseDictionary();

afterEach(() => {
  cleanup();
});

// Browser APIs jsdom lacks but the UI kit (Radix, cmdk, next-themes) and the
// router call. They are inert stand-ins, enough for components to mount.

if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  });
}

window.scrollTo = vi.fn();

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

Element.prototype.scrollIntoView ??= vi.fn();
Element.prototype.hasPointerCapture ??= vi.fn(() => false);
Element.prototype.setPointerCapture ??= vi.fn();
Element.prototype.releasePointerCapture ??= vi.fn();
