import { describe, expect, it } from "vitest";

import { routeTemplate, UNKNOWN_ROUTE } from "@/lib/telemetry/route-template";

describe("routeTemplate", () => {
  it("maps exact routes to themselves", () => {
    expect(routeTemplate("/")).toBe("/");
    expect(routeTemplate("/calc")).toBe("/calc");
    expect(routeTemplate("/admin/feedback")).toBe("/admin/feedback");
    expect(routeTemplate("/groups/new")).toBe("/groups/new");
  });

  it("maps parameter routes to templates", () => {
    expect(routeTemplate("/u/ashketchum")).toBe("/u/:username");
    expect(routeTemplate("/post/abc-123")).toBe("/post/:postId");
    expect(routeTemplate("/teams/team-9")).toBe("/teams/:teamId");
    expect(routeTemplate("/g/vgc-eu")).toBe("/g/:slug");
    expect(routeTemplate("/moderation/act-1")).toBe("/moderation/:actionId");
    expect(routeTemplate("/from/tiktok")).toBe("/from/:source");
  });

  it("strips query strings and fragments", () => {
    expect(routeTemplate("/u/ash?ref=feed#top")).toBe("/u/:username");
    expect(routeTemplate("/calc?format=singles")).toBe("/calc");
    expect(routeTemplate("/terms#section-2")).toBe("/terms");
  });

  it("ignores trailing slashes", () => {
    expect(routeTemplate("/calc/")).toBe("/calc");
    expect(routeTemplate("/")).toBe("/");
  });

  it("never returns the real path for unknown routes", () => {
    expect(routeTemplate("/some/secret/path")).toBe(UNKNOWN_ROUTE);
    expect(routeTemplate("/some/secret/path")).not.toContain("secret");
  });
});
