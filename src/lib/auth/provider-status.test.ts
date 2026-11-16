import { describe, expect, it, vi } from "vitest";

import { createProviderCheck } from "@/lib/auth/provider-status";

const config = { url: "https://db.example.com", anonKey: "anon-key" };

function settingsResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

describe("createProviderCheck", () => {
  it("answers null in guest mode without fetching", async () => {
    const fetchSettings = vi.fn();
    const check = createProviderCheck(null, fetchSettings);
    expect(await check("google")).toBeNull();
    expect(await check("discord")).toBeNull();
    expect(fetchSettings).not.toHaveBeenCalled();
  });

  it("reads the provider switches from the project settings", async () => {
    const fetchSettings = vi
      .fn()
      .mockResolvedValue(
        settingsResponse({ external: { google: true, discord: false } }),
      );
    const check = createProviderCheck(config, fetchSettings);
    expect(await check("google")).toBe(true);
    expect(await check("discord")).toBe(false);
    expect(fetchSettings).toHaveBeenCalledWith(
      "https://db.example.com/auth/v1/settings",
      { headers: { apikey: "anon-key" } },
    );
  });

  it("strips a trailing slash from the project URL", async () => {
    const fetchSettings = vi.fn().mockResolvedValue(settingsResponse({}));
    const check = createProviderCheck(
      { url: "https://db.example.com/", anonKey: "anon-key" },
      fetchSettings,
    );
    await check("google");
    expect(fetchSettings).toHaveBeenCalledWith(
      "https://db.example.com/auth/v1/settings",
      expect.anything(),
    );
  });

  it("answers null when the switch is missing or not a boolean", async () => {
    const check = createProviderCheck(
      config,
      vi
        .fn()
        .mockResolvedValue(settingsResponse({ external: { google: "yes" } })),
    );
    expect(await check("google")).toBeNull();
    expect(await check("discord")).toBeNull();

    const noExternal = createProviderCheck(
      config,
      vi.fn().mockResolvedValue(settingsResponse({})),
    );
    expect(await noExternal("google")).toBeNull();

    const badExternal = createProviderCheck(
      config,
      vi.fn().mockResolvedValue(settingsResponse({ external: "nope" })),
    );
    expect(await badExternal("google")).toBeNull();
  });

  it("answers null when the settings cannot be read", async () => {
    const failed = createProviderCheck(
      config,
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );
    expect(await failed("google")).toBeNull();

    const threw = createProviderCheck(
      config,
      vi.fn().mockRejectedValue(new Error("offline")),
    );
    expect(await threw("google")).toBeNull();
  });

  it("fetches the settings once for several providers", async () => {
    const fetchSettings = vi
      .fn()
      .mockResolvedValue(
        settingsResponse({ external: { google: true, discord: false } }),
      );
    const check = createProviderCheck(config, fetchSettings);
    await check("google");
    await check("discord");
    await check("google");
    expect(fetchSettings).toHaveBeenCalledTimes(1);
  });

  it("retries the settings after a failed response", async () => {
    const fetchSettings = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce(settingsResponse({ external: { google: true } }));
    const check = createProviderCheck(config, fetchSettings);
    expect(await check("google")).toBeNull();
    expect(await check("google")).toBe(true);
    expect(fetchSettings).toHaveBeenCalledTimes(2);
  });

  it("retries the settings after the fetch throws", async () => {
    const fetchSettings = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(settingsResponse({ external: { discord: true } }));
    const check = createProviderCheck(config, fetchSettings);
    expect(await check("discord")).toBeNull();
    expect(await check("discord")).toBe(true);
    expect(fetchSettings).toHaveBeenCalledTimes(2);
  });
});
