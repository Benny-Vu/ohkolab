import { describe, expect, it } from "vitest";

import { originFor } from "./site";

describe("originFor", () => {
  it("defaults to the live site with no Host override (same-zone subrequest)", () => {
    expect(originFor(undefined)).toEqual({
      url: "https://ohkolab.com",
      host: null,
    });
  });

  it("explicit direct mode is the same", () => {
    expect(originFor("direct")).toEqual(originFor(undefined));
  });

  it("host-header mode targets GitHub Pages only when asked for", () => {
    expect(originFor("host-header")).toEqual({
      url: "https://vu-forge.github.io",
      host: "ohkolab.com",
    });
  });
});
