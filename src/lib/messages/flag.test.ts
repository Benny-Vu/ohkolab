import { afterEach, describe, expect, it, vi } from "vitest";

import { directMessagesEnabled } from "@/lib/messages/flag";

describe("directMessagesEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off unless VITE_DIRECT_MESSAGES is exactly 'true'", () => {
    // Unset.
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
    expect(directMessagesEnabled()).toBe(false);
    vi.stubEnv("VITE_DIRECT_MESSAGES", "false");
    expect(directMessagesEnabled()).toBe(false);
    vi.stubEnv("VITE_DIRECT_MESSAGES", "TRUE");
    expect(directMessagesEnabled()).toBe(false);
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    expect(directMessagesEnabled()).toBe(true);
  });
});
