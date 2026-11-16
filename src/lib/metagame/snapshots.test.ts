import { expect, test } from "vitest";
import { indexFixture } from "@/lib/metagame/fixture";
import {
  findSnapshot,
  listSnapshots,
  normalizeDataPath,
} from "@/lib/metagame/snapshots";

test("normalizeDataPath prefixes a slash when missing", () => {
  expect(normalizeDataPath("data/metagame/2026-10/doubles.json")).toBe(
    "/data/metagame/2026-10/doubles.json",
  );
  expect(normalizeDataPath("/data/metagame/index.json")).toBe(
    "/data/metagame/index.json",
  );
});

test("listSnapshots returns a format's snapshots newest first", () => {
  expect(listSnapshots(indexFixture, "doubles").map((s) => s.period)).toEqual([
    "2026-10",
    "2026-09",
  ]);
  expect(listSnapshots(indexFixture, "singles").map((s) => s.period)).toEqual([
    "2026-09",
  ]);
});

test("findSnapshot resolves the latest snapshot for a format", () => {
  expect(findSnapshot(indexFixture, "doubles", null)?.period).toBe("2026-10");
  expect(findSnapshot(indexFixture, "singles", null)?.period).toBe("2026-09");
});

test("findSnapshot resolves an explicit period", () => {
  expect(findSnapshot(indexFixture, "doubles", "2026-09")?.path).toBe(
    "data/metagame/2026-09/doubles.json",
  );
  expect(findSnapshot(indexFixture, "doubles", "2025-01")).toBeNull();
});

test("findSnapshot falls back to the newest when latest is absent", () => {
  const index = { latest: {}, snapshots: indexFixture.snapshots };
  expect(findSnapshot(index, "doubles", null)?.period).toBe("2026-10");
});

test("findSnapshot returns null when the format has no snapshots", () => {
  expect(
    findSnapshot({ latest: {}, snapshots: [] }, "doubles", null),
  ).toBeNull();
});
