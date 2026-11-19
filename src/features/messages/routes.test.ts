import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The routes array is decided at module load, so each test re-imports the
 * module fresh (vi.resetModules) under its own flag value.
 */
async function loadRoutes(): Promise<unknown[]> {
  vi.resetModules();
  const module = await import("@/features/messages/routes");
  return module.messagesRoutes;
}

describe("messagesRoutes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is empty while the flag is off", async () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
    expect(await loadRoutes()).toEqual([]);
  });

  it("declares the list and thread routes while the flag is on", async () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const routes = await loadRoutes();
    expect(routes.map((route) => (route as { path?: string }).path)).toEqual([
      "messages",
      "messages/:id",
    ]);
  });
});
