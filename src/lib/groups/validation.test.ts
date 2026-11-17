import { describe, expect, it } from "vitest";

import {
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  GROUP_SLUG_MAX,
  GROUP_SLUG_MIN,
  asGroupMemberStatus,
  asGroupRole,
  asGroupVisibility,
  canModerateGroup,
  normalizeGroupDescription,
  normalizeGroupName,
  normalizeSlug,
  slugFromName,
  validateGroupDescription,
  validateGroupName,
  validateGroupVisibility,
  validateSlug,
} from "@/lib/groups/validation";

describe("slugFromName", () => {
  it("lowercases and converts spaces to hyphens", () => {
    expect(slugFromName("Elite Four Fans")).toBe("elite-four-fans");
  });

  it("strips characters the database would reject", () => {
    expect(slugFromName("Team Rocket! (Kanto)")).toBe("team-rocket-kanto");
  });

  it("collapses repeated hyphens and trims edges", () => {
    expect(slugFromName("  --  A  B  --  ")).toBe("a-b");
  });

  it("returns an empty string for names without usable characters", () => {
    expect(slugFromName("!!!")).toBe("");
  });
});

describe("normalizeSlug", () => {
  it("trims and lowercases", () => {
    expect(normalizeSlug("  Rocket-Team  ")).toBe("rocket-team");
  });
});

describe("validateSlug", () => {
  it("accepts a valid slug", () => {
    expect(validateSlug("elite-four-fans")).toBeNull();
  });

  it("rejects an empty slug", () => {
    expect(validateSlug("")).toBe("Choose an address for your group.");
  });

  it("rejects a slug shorter than the minimum", () => {
    expect(validateSlug("ab")).toContain("at least");
  });

  it("rejects a slug longer than the maximum", () => {
    expect(validateSlug("a".repeat(GROUP_SLUG_MAX + 1))).toContain("at most");
  });

  it("rejects uppercase letters, spaces and symbols", () => {
    expect(validateSlug("Rocket Team")).not.toBeNull();
    expect(validateSlug("rocket_team")).not.toBeNull();
    expect(validateSlug("rocket team")).not.toBeNull();
  });

  it("accepts a slug at the exact bounds", () => {
    expect(validateSlug("a".repeat(GROUP_SLUG_MIN))).toBeNull();
    expect(validateSlug("a".repeat(GROUP_SLUG_MAX))).toBeNull();
  });
});

describe("validateGroupName", () => {
  it("accepts a normal name", () => {
    expect(validateGroupName(normalizeGroupName("  Elite Four  "))).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(validateGroupName(normalizeGroupName("   "))).toBe(
      "Choose a name for your group.",
    );
  });

  it("rejects a name longer than the maximum", () => {
    expect(
      validateGroupName(normalizeGroupName("a".repeat(GROUP_NAME_MAX + 1))),
    ).toContain("limited to");
  });
});

describe("group description", () => {
  it("normalizes whitespace-only descriptions to null", () => {
    expect(normalizeGroupDescription("   ")).toBeNull();
    expect(normalizeGroupDescription(null)).toBeNull();
    expect(normalizeGroupDescription(undefined)).toBeNull();
  });

  it("keeps trimmed text", () => {
    expect(normalizeGroupDescription("  We love the Elite Four.  ")).toBe(
      "We love the Elite Four.",
    );
  });

  it("accepts a description at the limit and rejects longer", () => {
    expect(
      validateGroupDescription("a".repeat(GROUP_DESCRIPTION_MAX)),
    ).toBeNull();
    expect(
      validateGroupDescription("a".repeat(GROUP_DESCRIPTION_MAX + 1)),
    ).toContain("limited to");
  });
});

describe("validateGroupVisibility", () => {
  it("accepts the two supported values", () => {
    expect(validateGroupVisibility("public")).toBeNull();
    expect(validateGroupVisibility("invite_only")).toBeNull();
  });

  it("rejects anything else", () => {
    expect(validateGroupVisibility("private")).not.toBeNull();
    expect(validateGroupVisibility("")).not.toBeNull();
  });
});

describe("role helpers", () => {
  it("lets owners and moderators moderate, but not plain members", () => {
    expect(canModerateGroup("owner")).toBe(true);
    expect(canModerateGroup("moderator")).toBe(true);
    expect(canModerateGroup("member")).toBe(false);
    expect(canModerateGroup(null)).toBe(false);
  });

  it("narrows database strings with safe defaults", () => {
    expect(asGroupRole("owner")).toBe("owner");
    expect(asGroupRole("moderator")).toBe("moderator");
    expect(asGroupRole("member")).toBe("member");
    expect(asGroupRole("bogus")).toBe("member");
    expect(asGroupVisibility("invite_only")).toBe("invite_only");
    expect(asGroupVisibility("bogus")).toBe("public");
    expect(asGroupMemberStatus("invited")).toBe("invited");
    expect(asGroupMemberStatus("bogus")).toBe("active");
  });
});
