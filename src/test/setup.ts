import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { registerEnglishDomain } from "@/lib/i18n/en-loader";
import { accountEn } from "@/lib/i18n/entries/account";
import { communityEn } from "@/lib/i18n/entries/community";
import { toolsEn } from "@/lib/i18n/entries/tools";
import { loadJapaneseDictionary } from "@/lib/i18n/ja-loader";

// Both dictionaries load lazily in production (their own chunks, with the
// raw key as the last-resort fallback). Tests assert translated text right
// away, so the setup registers the English feature domains synchronously
// and loads the Japanese dictionary once before any test runs.
registerEnglishDomain("community", communityEn);
registerEnglishDomain("account", accountEn);
registerEnglishDomain("tools", toolsEn);
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
