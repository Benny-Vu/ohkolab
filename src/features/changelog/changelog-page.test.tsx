import { expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { ChangelogPage } from "@/features/changelog/changelog-page";
import { changelogEntries } from "@/features/changelog/entries";
import { hasUnseenChangelog } from "@/features/changelog/use-new-entries";
import { createFakeAuth, renderPage } from "@/features/account/test-utils";

it("lists the releases newest first and marks them seen", () => {
  renderPage(<ChangelogPage />, createFakeAuth(), { path: "/login" });

  // The newest release's line is on the page, under the "What's new" title.
  expect(screen.getByText("What's new")).toBeInTheDocument();
  expect(screen.getByText(changelogEntries[0]!.en)).toBeInTheDocument();
  expect(
    screen.getByText(changelogEntries[changelogEntries.length - 1]!.en),
  ).toBeInTheDocument();

  // Visiting the page counts as having seen everything.
  expect(hasUnseenChangelog()).toBe(false);
});
