import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { accountEn } from "@/lib/i18n/entries/account";
import { communityEn } from "@/lib/i18n/entries/community";
import { shellEn } from "@/lib/i18n/entries/shell";
import { toolsEn } from "@/lib/i18n/entries/tools";
import { describe, expect, it } from "vitest";

/**
 * Flags translation keys nothing in the app references. The scan reads the
 * app sources (production files only: no tests, no dictionary files) and
 * looks for each key as a quoted literal — which is how every key reaches
 * `t()`, directly or through a key map.
 *
 * Keys referenced only from test files count as unused: the app is what
 * ships. If a key is genuinely referenced dynamically and cannot be seen as
 * a literal, add it to the allowlist below with a comment saying why.
 */
const DYNAMICALLY_REFERENCED: string[] = [];

function collectFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(path));
    } else if (
      /\.[tj]sx?$/.test(entry.name) &&
      !entry.name.includes(".test.") &&
      !entry.name.includes(".stories.")
    ) {
      files.push(path);
    }
  }
  return files;
}

function appSources(): string[] {
  const root = process.cwd();
  const files: string[] = [];
  for (const entry of readdirSync(join(root, "src"), {
    withFileTypes: true,
  })) {
    const path = join(root, "src", entry.name);
    if (entry.isDirectory()) {
      // The dictionaries themselves and their machinery are not usage sites.
      if (entry.name === "i18n") continue;
      files.push(...collectFiles(path));
    } else if (
      /\.[tj]sx?$/.test(entry.name) &&
      !entry.name.includes(".test.")
    ) {
      files.push(path);
    }
  }
  return files.map((path) => readFileSync(path, "utf8"));
}

describe("i18n key hygiene", () => {
  it("has no unused translation keys", () => {
    const keys = new Set([
      ...Object.keys(shellEn),
      ...Object.keys(communityEn),
      ...Object.keys(accountEn),
      ...Object.keys(toolsEn),
    ]);
    const sources = appSources().join("\n");

    const unused = [...keys].filter(
      (key) =>
        !sources.includes(`"${key}"`) && !DYNAMICALLY_REFERENCED.includes(key),
    );

    expect(unused, `unused keys: ${unused.join(", ")}`).toEqual([]);
  });
});
