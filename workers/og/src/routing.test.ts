import { describe, expect, it } from "vitest";

import {
  isPagePath,
  matchOgImage,
  matchPage,
  ogImageCacheControl,
} from "./routing";

const UUID = "3f2c8a4e-1b2d-4c5a-9e8f-7a6b5c4d3e2f";

describe("matchOgImage", () => {
  it("matches every image type", () => {
    expect(matchOgImage("/og/profile/benny.png")).toEqual({
      kind: "profile",
      id: "benny",
    });
    expect(matchOgImage(`/og/team/${UUID}.png`)).toEqual({
      kind: "team",
      id: UUID,
    });
    expect(matchOgImage(`/og/post/${UUID}.png`)).toEqual({
      kind: "post",
      id: UUID,
    });
    expect(matchOgImage("/og/calc/default.png")).toEqual({
      kind: "calc",
      id: "default",
    });
    expect(matchOgImage("/og/brand/ohkolab.png")).toEqual({
      kind: "brand",
      id: "ohkolab",
    });
  });

  it("is case-insensitive about UUIDs", () => {
    const upper = UUID.toUpperCase();
    expect(matchOgImage(`/og/team/${upper}.png`)).toEqual({
      kind: "team",
      id: upper,
    });
  });

  it("rejects malformed image paths", () => {
    // No id.
    expect(matchOgImage("/og/team/.png")).toBeNull();
    // Not a PNG.
    expect(matchOgImage(`/og/team/${UUID}.jpg`)).toBeNull();
    // Wrong kind.
    expect(matchOgImage(`/og/user/${UUID}.png`)).toBeNull();
    // Wrong id shape: team ids must be UUIDs.
    expect(matchOgImage("/og/team/not-a-uuid.png")).toBeNull();
    // Usernames are [a-z0-9_]{3,20}: too short, too long, invalid chars.
    expect(matchOgImage("/og/profile/ab.png")).toBeNull();
    expect(matchOgImage("/og/profile/waytoolongusernamevalue.png")).toBeNull();
    expect(matchOgImage("/og/profile/Benny!.png")).toBeNull();
    // Nested paths are not image requests.
    expect(matchOgImage("/og/team/x/og/team/y.png")).toBeNull();
  });

  it("returns null for pages and assets", () => {
    expect(matchOgImage("/")).toBeNull();
    expect(matchOgImage("/calc")).toBeNull();
    expect(matchOgImage("/assets/index.js")).toBeNull();
    expect(matchOgImage("/og")).toBeNull();
    expect(matchOgImage("/og/team")).toBeNull();
  });
});

describe("matchPage", () => {
  it("classifies the shareable routes", () => {
    expect(matchPage("/")).toEqual({ kind: "home", id: null });
    expect(matchPage("/calc")).toEqual({ kind: "calc", id: null });
    expect(matchPage(`/teams/${UUID}`)).toEqual({ kind: "team", id: UUID });
    expect(matchPage("/u/benny")).toEqual({ kind: "profile", id: "benny" });
    expect(matchPage(`/post/${UUID}`)).toEqual({ kind: "post", id: UUID });
  });

  it("gives everything else the generic card", () => {
    expect(matchPage("/teams")).toEqual({ kind: "generic", id: null });
    expect(matchPage("/meta")).toEqual({ kind: "generic", id: null });
    expect(matchPage("/terms")).toEqual({ kind: "generic", id: null });
    expect(matchPage("/g/some-group")).toEqual({ kind: "generic", id: null });
    expect(matchPage("/nonexistent")).toEqual({ kind: "generic", id: null });
    expect(matchPage("/assets/index.js")).toEqual({
      kind: "generic",
      id: null,
    });
  });

  it("does not classify query strings or hashes as page content", () => {
    // matchPage takes a pathname; queries never reach it.
    expect(matchPage("/calc")).toEqual({ kind: "calc", id: null });
  });

  it("rejects malformed route parameters", () => {
    expect(matchPage("/teams/not-a-uuid")).toEqual({
      kind: "generic",
      id: null,
    });
    expect(matchPage("/post/short")).toEqual({ kind: "generic", id: null });
    expect(matchPage("/u/ab")).toEqual({ kind: "generic", id: null });
    expect(matchPage("/u/benny/extra")).toEqual({ kind: "generic", id: null });
  });
});

describe("ogImageCacheControl", () => {
  it("caches stable images for a day", () => {
    expect(ogImageCacheControl("team")).toBe("public, max-age=86400");
    expect(ogImageCacheControl("calc")).toBe("public, max-age=86400");
    expect(ogImageCacheControl("brand")).toBe("public, max-age=86400");
  });

  it("caches live content for an hour", () => {
    expect(ogImageCacheControl("post")).toBe("public, max-age=3600");
    expect(ogImageCacheControl("profile")).toBe("public, max-age=3600");
  });
});

describe("isPagePath", () => {
  it("treats app routes as pages", () => {
    for (const path of [
      "/",
      "/calc",
      "/teams/abc",
      "/u/benny",
      "/g/vgc-talk",
    ]) {
      expect(isPagePath(path)).toBe(true);
    }
  });

  it("treats static files as files, so crawlers get the real file", () => {
    for (const path of [
      "/robots.txt",
      "/sitemap.xml",
      "/llms.txt",
      "/favicon.svg",
      "/assets/index-abc123.js",
      "/manifest.webmanifest",
    ]) {
      expect(isPagePath(path)).toBe(false);
    }
  });
});
