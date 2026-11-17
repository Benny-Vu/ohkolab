// Ingests last month's Smogon chaos files into public/data/metagame/.
// Run from the repo root: node scripts/metagame/ingest.ts [--period YYYY-MM]
//
// On any failure the existing snapshots stay untouched and the process
// exits non-zero, so a failed monthly run simply keeps the last committed
// data (the first fallback in the data-sources note).

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { FORMAT_IDS, RATING_CUTOFF, SMOGON_STATS_URL } from "./config.ts";
import { createCalcNameResolver } from "./names.ts";
import { previousPeriod, parsePeriodArg } from "./period.ts";
import {
  buildSnapshot,
  isIngested,
  mergeIndex,
  snapshotPath,
} from "./transform.ts";
import type {
  BattleFormat,
  ChaosFile,
  MetagameIndex,
  MetagameSnapshot,
} from "./types.ts";

const FORMATS: BattleFormat[] = ["singles", "doubles"];

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dataRoot = join(repoRoot, "public", "data", "metagame");
const indexUrl = join(dataRoot, "index.json");

function chaosUrl(period: string, format: BattleFormat): string {
  return `${SMOGON_STATS_URL}/${period}/chaos/${FORMAT_IDS[format]}-${RATING_CUTOFF}.json`;
}

async function readIndex(): Promise<MetagameIndex | null> {
  try {
    return JSON.parse(await readFile(indexUrl, "utf8")) as MetagameIndex;
  } catch {
    return null;
  }
}

async function fetchChaos(
  period: string,
  format: BattleFormat,
): Promise<ChaosFile> {
  const url = chaosUrl(period, format);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Smogon returned ${response.status} for ${url}`);
  }
  return (await response.json()) as ChaosFile;
}

async function main(): Promise<void> {
  const period =
    parsePeriodArg(process.argv.slice(2)) ?? previousPeriod(new Date());
  const existing = await readIndex();
  if (isIngested(existing, period)) {
    console.log(`Period ${period} is already ingested; nothing to do.`);
    return;
  }

  console.log(`Ingesting Smogon chaos data for ${period}...`);
  // Fetch both formats before writing anything: all-or-nothing.
  const chaos = new Map<BattleFormat, ChaosFile>();
  for (const format of FORMATS) {
    const file = await fetchChaos(period, format);
    console.log(
      `  ${format}: ${file.info.metagame}, ${file.info["number of battles"]} battles`,
    );
    chaos.set(format, file);
  }

  const names = createCalcNameResolver();
  const generatedAt = new Date().toISOString();
  const snapshots: MetagameSnapshot[] = FORMATS.map((format) =>
    buildSnapshot(
      format,
      period,
      chaos.get(format)!,
      names,
      generatedAt,
      chaosUrl(period, format),
    ),
  );

  await mkdir(join(dataRoot, period), { recursive: true });
  for (const snapshot of snapshots) {
    const path = join(dataRoot, period, `${snapshot.format}.json`);
    await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`);
    console.log(`  wrote ${path}`);
  }
  const index = mergeIndex(existing, snapshots);
  await writeFile(indexUrl, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`  wrote ${indexUrl}`);
  console.log(
    `Latest: singles ${snapshotPath(period, "singles")}, doubles ${snapshotPath(period, "doubles")}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
