/**
 * Recording mode: a hidden switch for screen recordings and demo videos.
 *
 * Opening the app with `?demo=1` turns it on for the browser session
 * (sessionStorage, so it survives navigation but never the tab). While on,
 * the app hides personal UI (the account menu, the notification bell, the
 * unread badges), fills empty states with sample content that is clearly
 * marked as examples, and enlarges touch feedback. The sample content is
 * render-only — nothing in demo mode ever posts, writes or changes data.
 */

const DEMO_FLAG = "ohkolab:demo";

/**
 * Reads the URL once at startup: `?demo=1` starts demo mode for the
 * session. Runs before the first render, so nothing flickers.
 */
export function initDemoMode(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      window.sessionStorage.setItem(DEMO_FLAG, "1");
    }
  } catch {
    // Storage can be blocked (private mode); demo mode just stays off.
  }
}

/** Whether demo mode is on for this session. */
export function isDemoMode(): boolean {
  try {
    return window.sessionStorage.getItem(DEMO_FLAG) === "1";
  } catch {
    return false;
  }
}
