import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { titleForPath } from "@/app/page-title";
import { renderAt } from "@/app/test-utils";

afterEach(() => {
  document.title = "";
});

describe("titleForPath", () => {
  it("titles every route", () => {
    expect(titleForPath("/")).toBe("OHKOLab");
    expect(titleForPath("/calc")).toBe("Damage calculator · OHKOLab");
    expect(titleForPath("/teams")).toBe("Teams · OHKOLab");
    expect(titleForPath("/teams/abc123")).toBe("Team · OHKOLab");
    expect(titleForPath("/meta")).toBe("Metagame · OHKOLab");
    expect(titleForPath("/profile")).toBe("Profile · OHKOLab");
    expect(titleForPath("/notifications")).toBe("Notifications · OHKOLab");
    expect(titleForPath("/groups")).toBe("Groups · OHKOLab");
    expect(titleForPath("/groups/new")).toBe("Create a group · OHKOLab");
    expect(titleForPath("/g/test-group")).toBe("Group · OHKOLab");
    expect(titleForPath("/admin/reports")).toBe("Reports · OHKOLab");
    expect(titleForPath("/admin/appeals")).toBe("Appeals · OHKOLab");
    expect(titleForPath("/moderation/abc")).toBe("Moderation notice · OHKOLab");
    expect(titleForPath("/login")).toBe("Sign in · OHKOLab");
    expect(titleForPath("/auth/callback")).toBe("Signing in · OHKOLab");
    expect(titleForPath("/reset-password")).toBe("Reset password · OHKOLab");
    expect(titleForPath("/u/ashketchum")).toBe("ashketchum · OHKOLab");
    expect(titleForPath("/terms")).toBe("Terms · OHKOLab");
    expect(titleForPath("/privacy")).toBe("Privacy · OHKOLab");
    expect(titleForPath("/nope")).toBe("Page not found · OHKOLab");
  });
});

describe("usePageTitle", () => {
  it("sets the document title for the current route", () => {
    renderAt("/calc");
    expect(document.title).toBe("Damage calculator · OHKOLab");
  });

  it("updates the title when navigating", async () => {
    renderAt("/");
    expect(document.title).toBe("OHKOLab");

    const user = userEvent.setup();
    await user.click(screen.getAllByRole("link", { name: "Calc" })[0]!);
    expect(document.title).toBe("Damage calculator · OHKOLab");

    await user.click(screen.getAllByRole("link", { name: "Teams" })[0]!);
    expect(document.title).toBe("Teams · OHKOLab");
  });
});
