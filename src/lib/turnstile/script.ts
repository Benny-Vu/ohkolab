/**
 * Loads the Turnstile script lazily: nothing is fetched until a form that
 * shows the widget mounts, and only one script tag is ever added. The script
 * is requested with `render=explicit`, so widgets are created only through
 * `window.turnstile.render`, never through implicit `data-` attributes.
 */
export const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";

const SCRIPT_MARKER = "data-ohkolab-turnstile";
const LOAD_ERROR = "Cloudflare Turnstile could not be loaded.";

let loading: Promise<void> | null = null;

function findScript(): HTMLScriptElement | null {
  return document.querySelector(`script[${SCRIPT_MARKER}]`);
}

function injectScript(): HTMLScriptElement {
  const script = document.createElement("script");
  script.src = `${TURNSTILE_SCRIPT_URL}?render=explicit`;
  script.async = true;
  script.defer = true;
  script.setAttribute(SCRIPT_MARKER, "");
  document.head.appendChild(script);
  return script;
}

/**
 * Ensures `window.turnstile` is available, resolving once it is. Safe to
 * call from anywhere, any number of times: concurrent callers share one
 * load, and a failed load is retried by the next caller.
 */
export function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const script = findScript() ?? injectScript();
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        // A broken tag must not block the next attempt.
        script.remove();
        reject(new Error(LOAD_ERROR));
      },
      { once: true },
    );
  });

  const attempt: Promise<void> = loading.catch((error: Error) => {
    loading = null;
    throw error;
  });
  return attempt;
}

/** Test seam: forget a finished load so the next call starts over. */
export function resetTurnstileLoadForTests(): void {
  loading = null;
}
