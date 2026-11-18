import { isNativeApp } from "@/lib/platform";
import type { Theme } from "@/lib/theme";

/**
 * Keeps the Android status bar in sync with the app theme: light icons on the
 * dark theme, dark icons on the light theme, also when the theme is toggled at
 * runtime. The `@capacitor/status-bar` import stays dynamic behind
 * `isNativeApp()` so the plugin code never reaches the web bundle.
 */

/** Applies the status-bar style that matches `theme`. No-op on the web. */
export async function applyStatusBarTheme(theme: Theme): Promise<void> {
  if (!isNativeApp()) return;
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  await StatusBar.setStyle({
    style: theme === "dark" ? Style.Dark : Style.Light,
  });
}

/**
 * Reads the theme the way `src/index.html` applies it before the first paint:
 * the `dark` class on the document element.
 */
export function themeFromDocument(doc: Document): Theme {
  return doc.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Applies the status-bar style now and re-applies it whenever the app theme
 * changes at runtime. Resolves to a disposer. No-op on the web.
 */
export function watchStatusBarTheme(doc: Document): () => void {
  const sync = () => void applyStatusBarTheme(themeFromDocument(doc));
  const observer = new MutationObserver(sync);
  observer.observe(doc.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  sync();
  return () => observer.disconnect();
}
