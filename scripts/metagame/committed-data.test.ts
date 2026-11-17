import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  parseMetagameIndex,
  parseMetagameSnapshot,
} from "@/lib/metagame/parse";

// Vitest runs from the repo root, so the committed data is a stable path.
const dataRoot = join(process.cwd(), "public", "data", "metagame");

function committedJsonFiles(): string[] {
  return readdirSync(dataRoot, { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => entry.endsWith(".json"));
}

describe("committed metagame data", () => {
  it("parses the index", () => {
    const index = parseMetagameIndex(
      JSON.parse(readFileSync(join(dataRoot, "index.json"), "utf8")),
    );
    expect(index).not.toBeNull();
  });

  it("parses every committed snapshot", () => {
    const snapshots = committedJsonFiles().filter(
      (file) => file !== "index.json",
    );
    expect(snapshots.length).toBeGreaterThan(0);
    for (const file of snapshots) {
      const snapshot = parseMetagameSnapshot(
        JSON.parse(readFileSync(join(dataRoot, file), "utf8")),
      );
      expect(snapshot, file).not.toBeNull();
    }
  });
});
