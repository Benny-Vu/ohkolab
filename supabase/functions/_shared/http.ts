/**
 * fetch with a timeout (Deno). The screening function must never hang on a
 * slow OpenAI or img.ohkolab.com: a stuck request would leave the image
 * pending with the client waiting; a timeout turns that into a retryable
 * 503 instead.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs ?? 30_000);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
