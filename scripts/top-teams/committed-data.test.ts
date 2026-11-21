import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseTopTeamsFile } from "@/lib/top-teams/parse";
import { MIN_PLAYERS } from "./config.ts";

// Vitest runs from the repo root, so the committed data is a stable path.
const snapshotPath = join(
  process.cwd(),
  "public",
  "data",
  "top-teams",
  "teams.json",
);

/** The payload ceiling: the file is fetched by phones at runtime. */
const MAX_SNAPSHOT_BYTES = 1.5 * 1024 * 1024;

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

  it("stays under the payload ceiling, minified", () => {
    if (!existsSync(snapshotPath)) return;
    const bytes = statSync(snapshotPath).size;
    expect(
      bytes,
      `the snapshot is ${(bytes / 1024 / 1024).toFixed(2)} MB; tighten the ingest filters (scripts/top-teams/config.ts) if it grows past ${MAX_SNAPSHOT_BYTES} bytes`,
    ).toBeLessThanOrEqual(MAX_SNAPSHOT_BYTES);
  });

  it("keeps only events with at least the minimum player count", () => {
    if (!existsSync(snapshotPath)) return;
    const parsed = parseTopTeamsFile(
      JSON.parse(readFileSync(snapshotPath, "utf8")),
    );
    expect(parsed).not.toBeNull();
    for (const team of parsed?.teams ?? []) {
      expect(
        team.players,
        `${team.event} lists ${team.players} players`,
      ).toBeGreaterThanOrEqual(MIN_PLAYERS);
    }
  });
});
