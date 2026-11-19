/**
 * The entry-chunk budget, enforced inside `npm run build` (so CI, deploys and
 * local builds all pass through it). Fails when the entry chunk grows more
 * than 5 kB over the recorded baseline in scripts/entry-size-baseline.json.
 * A deliberate entry change records a new baseline with
 * `node scripts/entry-size.mjs --record`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const manifestPath = join(root, "dist", ".vite", "manifest.json");
const baselinePath = join(root, "scripts", "entry-size-baseline.json");

const BUDGET_BYTES = 5 * 1024;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

let baseline;
try {
  baseline = readJson(baselinePath).entryBytes;
} catch {
  console.error(
    "No entry size baseline. Run `npm run build && node scripts/entry-size.mjs --record` and commit the result.",
  );
  process.exit(1);
}

const manifest = readJson(manifestPath);
let entry;
for (const chunk of Object.values(manifest)) {
  if (chunk.isEntry) {
    entry = chunk;
    break;
  }
}
if (!entry) {
  console.error("No entry chunk in dist/.vite/manifest.json.");
  process.exit(1);
}

const entryBytes = entry.file
  ? readFileSync(join(root, "dist", entry.file)).size
  : 0;
const limit = baseline + BUDGET_BYTES;

console.log(
  `entry ${entryBytes} bytes (baseline ${baseline}, budget +${BUDGET_BYTES})`,
);

if (entryBytes > limit) {
  console.error(
    `Entry chunk grew past the budget: ${entryBytes} > ${limit} bytes. ` +
      "If the growth is accepted, record a new baseline: " +
      "`npm run build && node scripts/entry-size.mjs --record`.",
  );
  process.exit(1);
}
