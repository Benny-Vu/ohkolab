import { describe, expect, it } from "vitest";

import { permissionStateOf, silentStep, userStep } from "@/lib/push/permission";

describe("permissionStateOf", () => {
  it("keeps the states Capacitor reports", () => {
    expect(permissionStateOf("granted")).toBe("granted");
    expect(permissionStateOf("prompt")).toBe("prompt");
    expect(permissionStateOf("prompt-with-permission-request")).toBe(
      "prompt-with-permission-request",
    );
  });

  it("counts anything unexpected as denied, never prompt", () => {
    expect(permissionStateOf("denied")).toBe("denied");
    expect(permissionStateOf("")).toBe("denied");
    expect(permissionStateOf(undefined)).toBe("denied");
    expect(permissionStateOf({})).toBe("denied");
  });
});

describe("silentStep", () => {
  it("registers only on an already-granted permission", () => {
    expect(silentStep("granted")).toBe("register");
  });

  it("stops without prompting on every other state", () => {
    expect(silentStep("prompt")).toBe("stop");
    expect(silentStep("prompt-with-permission-request")).toBe("stop");
    expect(silentStep("denied")).toBe("stop");
  });
});

describe("userStep", () => {
  it("just registers when permission is already granted", () => {
    expect(userStep("granted")).toBe("register");
  });

  it("asks on both prompt states", () => {
    expect(userStep("prompt")).toBe("request");
    expect(userStep("prompt-with-permission-request")).toBe("request");
  });

  it("treats a denial as blocked, not as ask-again", () => {
    expect(userStep("denied")).toBe("blocked");
  });
});
