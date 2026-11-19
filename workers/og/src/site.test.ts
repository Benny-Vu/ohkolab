import { describe, expect, it } from "vitest";

import { originFor } from "./site";

describe("originFor", () => {
  it("defaults to the host-header origin (production)", () => {
    expect(originFor(undefined)).toEqual({
      url: "https://vu-forge.github.io",
      host: "ohkolab.com",
    });
  });

  it("explicit host-header mode is the same", () => {
    expect(originFor("host-header")).toEqual(originFor(undefined));
  });

  it("direct mode fetches the live site with no Host override (local dev)", () => {
    expect(originFor("direct")).toEqual({
      url: "https://ohkolab.com",
      host: null,
    });
  });
});
