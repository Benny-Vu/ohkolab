/**
 * Startup bundle measurement. Run after `npm run build`.
 *
 * Reports, in bytes:
 * - entry: the entry chunk (dist/assets/index-*.js)
 * - startup: every script in dist/index.html (the entry plus its static
 *   chunk imports, which the browser downloads before first render)
 * - ja startup: startup plus the chunks a Japanese first visit needs right
 *   after boot (the ja dictionary and the ja Pokémon names)
 *
 * `--record` writes the entry size into scripts/entry-size-baseline.json,
 * which scripts/check-entry-size.mjs enforces in CI. Record a new baseline
 * deliberately, when a change to the entry chunk is accepted.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const manifestPath = join(dist, ".vite", "manifest.json");
const baselinePath = join(root, "scripts", "entry-size-baseline.json");

/** Chunks a Japanese first visit loads right after boot, by source module. */
const JA_MODULES = ["src/lib/i18n/ja.ts", "src/data/i18n/ja-names.json"];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fileBytes(path) {
  return statSync(path).size;
}

function entryFromManifest(manifest) {
  for (const chunk of Object.values(manifest)) {
    if (chunk.isEntry) {
      return chunk;
    }
  }
  throw new Error("no entry chunk in the manifest");
}

function main() {
  const manifest = readJson(manifestPath);
  const entry = entryFromManifest(manifest);
  const entryBytes = fileBytes(join(dist, entry.file));

  // Everything index.html loads: the module script plus every modulepreload.
  const html = readFileSync(join(dist, "index.html"), "utf8");
  const startupFiles = [
    ...html.matchAll(/(?:src|href)="(\/?assets\/[^"]+\.js)"/g),
  ].map((match) => match[1].replace(/^\//, ""));
  if (startupFiles.length === 0) {
    throw new Error("no scripts found in dist/index.html");
  }
  const startupBytes = startupFiles.reduce(
    (total, file) => total + fileBytes(join(dist, file)),
    0,
  );

  let jaBytes = startupBytes;
  for (const module of JA_MODULES) {
    const chunk = manifest[module];
    if (chunk?.file) {
      jaBytes += fileBytes(join(dist, chunk.file));
    }
  }

  const report = {
    entryBytes,
    startupBytes,
    jaStartupBytes: jaBytes,
    startupFiles,
  };

  if (process.argv.includes("--record")) {
    writeFileSync(baselinePath, `${JSON.stringify({ entryBytes }, null, 2)}\n`);
    console.log(`baseline recorded: entry ${entryBytes} bytes`);
  }

  console.log(
    [
      `entry:    ${entryBytes}`,
      `startup:  ${startupBytes} (${startupFiles.length} chunks)`,
      `ja start: ${jaBytes}`,
    ].join("\n"),
  );
  // Keep the artifact list honest if dist has no manifest (never in CI).
  if (readdirSync(join(dist, "assets")).length === 0) {
    throw new Error("empty dist/assets");
  }
  return report;
}

main();
