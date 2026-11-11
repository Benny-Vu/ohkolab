import { useSyncExternalStore } from "react";

/**
 * Dark / light theme, dark by default. The choice is kept in local storage
 * and applied as the `dark` class on <html>; index.html applies it before the
 * first paint so there is no flash.
 */

export type Theme = "dark" | "light";

const THEME_KEY = "ohkolab:theme";
const DEFAULT_THEME: Theme = "dark";

const listeners = new Set<() => void>();
let currentTheme: Theme | undefined;

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "light"
      ? "light"
      : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function getTheme(): Theme {
  if (!currentTheme) {
    currentTheme = readTheme();
    applyTheme(currentTheme);
  }
  return currentTheme;
}

export function setTheme(theme: Theme): void {
  currentTheme = theme;
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the theme still holds for this session.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The active theme and a setter, as React state. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getTheme, () => DEFAULT_THEME);
  return [theme, setTheme];
}
