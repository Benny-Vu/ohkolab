import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { accountEn } from "@/lib/i18n/entries/account";
import { communityEn } from "@/lib/i18n/entries/community";
import { shellEn } from "@/lib/i18n/entries/shell";
import { toolsEn } from "@/lib/i18n/entries/tools";

/**
 * The no-flash guard for the split English dictionary: the entry bundle only
 * ships the shell strings, and every feature loads its domains with its
 * route. This test reads the source the same way the bundler sees it, so a
 * key that moved out of reach of its loader fails here instead of flashing
 * a raw key in production.
 *
 * - Entry audit: every translation key reachable from `src/main.tsx` through
 *   static imports (what lands in the entry chunk) must live in the shell
 *   dictionary.
 * - Route audit: for every feature, the keys reachable from its `routes.tsx`
 *   (including lazy imports) must belong to a domain its routes ensure via
 *   `ensureEnglishDomain` before rendering.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FEATURES = join(SRC, "features");
const I18N_DIR = join(SRC, "lib", "i18n");

type Domain = "shell" | "community" | "account" | "tools";

const DOMAIN_DICTIONARIES: [Domain, Record<string, string>][] = [
  ["shell", shellEn],
  ["community", communityEn],
  ["account", accountEn],
  ["tools", toolsEn],
];

/** key -> the domain file that declares it. */
const keyDomain = new Map<string, Domain>();
for (const [domain, dictionary] of DOMAIN_DICTIONARIES) {
  for (const key of Object.keys(dictionary)) {
    const existing = keyDomain.get(key);
    if (existing !== undefined && existing !== domain) {
      throw new Error(
        `"${key}" is declared in both ${existing} and ${domain}; ` +
          "each key must live in exactly one domain file",
      );
    }
    keyDomain.set(key, domain);
  }
}

/** Resolves an import specifier to a file on disk, or undefined. */
function resolveModule(
  specifier: string,
  fromFile: string,
): string | undefined {
  let base: string;
  if (specifier.startsWith("@/")) {
    base = join(SRC, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = resolve(dirname(fromFile), specifier);
  } else {
    return undefined; // A package: its strings are not ours.
  }
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return undefined;
}

/** String literals that could be translation keys (must contain a dot). */
const KEY_LITERAL_RE = /["']([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_.]+)+)["']/g;

/** Follows imports from the entry files and collects every key used there. */
function collectKeys(
  entryFiles: string[],
  { followDynamic }: { followDynamic: boolean },
): Set<string> {
  const keys = new Set<string>();
  const seen = new Set<string>();
  const queue = [...entryFiles];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    // The i18n machinery itself is where the keys are *declared*, not used;
    // following it would count every domain as reachable from everywhere.
    if (file.startsWith(I18N_DIR)) continue;
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(KEY_LITERAL_RE)) {
      const key = match[1];
      if (key !== undefined && keyDomain.has(key)) keys.add(key);
    }
    // Type imports are erased at build time: they pull in no strings.
    const valueSource = source
      .replace(/import\s+type\s[^;]*?from\s*["'][^"']+["'];?/g, "")
      .replace(/export\s+type\s*{[^}]*}\s*from\s*["'][^"']+["'];?/g, "");
    for (const match of valueSource.matchAll(
      /(?:import|export)\s[^;'"()]*?from\s*["']([^"']+)["']/g,
    )) {
      const resolved = resolveModule(match[1]!, file);
      if (resolved) queue.push(resolved);
    }
    if (followDynamic) {
      for (const match of valueSource.matchAll(
        /import\(\s*["']([^"']+)["']\s*\)/g,
      )) {
        const resolved = resolveModule(match[1]!, file);
        if (resolved) queue.push(resolved);
      }
    }
  }
  return keys;
}

/** The domains a feature's routes must ensure before rendering. */
function featureDomains(routesFile: string): Map<Domain, string[]> {
  const domains = new Map<Domain, string[]>();
  for (const key of collectKeys([routesFile], { followDynamic: true })) {
    const domain = keyDomain.get(key)!;
    if (domain === "shell") continue; // The shell dictionary is always loaded.
    let users = domains.get(domain);
    if (!users) {
      users = [];
      domains.set(domain, users);
    }
    users.push(key);
  }
  return domains;
}

describe("split English dictionary", () => {
  it("keeps every key the entry chunk renders in the shell dictionary", () => {
    const shellKeys = new Set(Object.keys(shellEn));
    const entryKeys = collectKeys([join(SRC, "main.tsx")], {
      followDynamic: false,
    });
    const outside = [...entryKeys].filter((key) => !shellKeys.has(key)).sort();
    expect(
      outside,
      "keys rendered by the entry graph but declared outside " +
        "entries/shell.ts (move them, and their Japanese values, into the " +
        "shell domain)",
    ).toEqual([]);
  });

  it("loads every domain its feature needs in each feature's routes", () => {
    const failures: string[] = [];
    let featuresChecked = 0;
    for (const feature of readdirSync(FEATURES)) {
      const routesFile = join(FEATURES, feature, "routes.tsx");
      if (!existsSync(routesFile)) continue; // A library feature: no routes.
      const domains = featureDomains(routesFile);
      if (domains.size === 0) continue;
      featuresChecked += 1;
      const source = readFileSync(routesFile, "utf8");
      const ensured = new Set(
        [...source.matchAll(/ensureEnglishDomain\(\s*"([a-z]+)"\s*\)/g)].map(
          (match) => match[1],
        ),
      );
      for (const [domain, keys] of domains) {
        if (!ensured.has(domain)) {
          failures.push(
            `${feature}: uses ${domain} keys (${keys
              .slice(0, 3)
              .join(", ")}, …) but routes.tsx never calls ` +
              `ensureEnglishDomain("${domain}")`,
          );
        }
      }
    }
    // Every routed feature that touches non-shell strings must be checked;
    // a zero here means the scanner stopped seeing the source.
    expect(featuresChecked).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });
});
