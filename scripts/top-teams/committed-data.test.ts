import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseTopTeamsFile } from "@/lib/top-teams/parse";

// Vitest runs from the repo root, so the committed data is a stable path.
const snapshotPath = join(
  process.cwd(),
  "public",
  "data",
  "top-teams",
  "teams.json",
);

describe("committed top-teams data", () => {
  it("exists and parses with the app's validator", () => {
    expect(
      existsSync(snapshotPath),
      "the seed snapshot must be committed",
    ).toBe(true);
    const parsed = parseTopTeamsFile(
      JSON.parse(readFileSync(snapshotPath, "utf8")),
    );
    expect(parsed).not.toBeNull();
  });

  it("stores no player names or countries anywhere in the file", () => {
    if (!existsSync(snapshotPath)) return;
    const raw = readFileSync(snapshotPath, "utf8");
    expect(raw).not.toMatch(/"(name|country|player)":/);
  });
});
