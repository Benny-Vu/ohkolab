import { afterEach, describe, expect, it } from "vitest";

import { setLocale } from "@/lib/i18n/locale";
import { DEFAULT_TEAM_NAME } from "@/lib/team/team-ops";
import { displayTeamName } from "@/lib/team/display";

describe("displayTeamName", () => {
  afterEach(() => {
    setLocale("en");
  });

  it("shows the localized untitled placeholder for the sentinel", () => {
    setLocale("en");
    expect(displayTeamName(DEFAULT_TEAM_NAME)).toBe("Untitled team");
    setLocale("ja");
    expect(displayTeamName(DEFAULT_TEAM_NAME)).toBe("無題の構築");
  });

  it("passes a named team through unchanged in both locales", () => {
    setLocale("en");
    expect(displayTeamName("Rain")).toBe("Rain");
    setLocale("ja");
    expect(displayTeamName("Rain")).toBe("Rain");
  });
});
