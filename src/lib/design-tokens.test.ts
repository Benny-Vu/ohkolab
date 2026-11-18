import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TYPE_COLORS } from "@/lib/type-colors";

/**
 * Contrast contract for the design tokens in src/index.css. The test parses
 * the real OKLCH values from the stylesheet, so it fails when a token change
 * breaks WCAG AA, not when a copy of the values here goes stale.
 *
 * - Text on its background: at least 4.5:1.
 * - Focus rings and other edges: at least 3:1.
 * - Type badge fills with white labels: at least 4.5:1.
 */

type Rgb = { r: number; g: number; b: number };

function parseThemeBlocks(css: string): {
  root: Map<string, string>;
  dark: Map<string, string>;
} {
  const block = (selector: string) => {
    // Anchor on the line start so prose mentions of ":root" in comments or
    // `@custom-variant` lines cannot be mistaken for the theme blocks.
    const re = new RegExp(
      `^\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`,
      "m",
    );
    const match = re.exec(css);
    if (!match) throw new Error(`Missing "${selector}" block in index.css`);
    const open = match.index + match[0].length - 1;
    const close = css.indexOf("}", open);
    if (close < 0)
      throw new Error(`Unterminated "${selector}" block in index.css`);
    const body = css.slice(open + 1, close);
    const vars = new Map<string, string>();
    for (const line of body.split("\n")) {
      const match = line.match(/--([\w-]+):\s*([^;]+);/);
      if (match?.[1] && match[2]) vars.set(match[1], match[2].trim());
    }
    return vars;
  };
  return { root: block(":root"), dark: block(".dark") };
}

function resolveToken(name: string, vars: Map<string, string>): string {
  const value = vars.get(name);
  if (!value) throw new Error(`Missing --${name} in index.css`);
  if (value.startsWith("var(")) {
    return resolveToken(value.slice(4, -1).trim(), vars);
  }
  return value;
}

function oklchToRgb(value: string): Rgb {
  const match = value.match(
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.%]+)?\s*\)/,
  );
  if (!match) throw new Error(`Not an OKLCH value: ${value}`);
  const l = Number(match[1]);
  const c = Number(match[2]);
  const h = (Number(match[3]) * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const lr = l_ ** 3;
  const mg = m_ ** 3;
  const sc = s_ ** 3;
  const gamma = (channel: number) => {
    const v =
      channel <= 0.0031308
        ? 12.92 * channel
        : 1.055 * channel ** (1 / 2.4) - 0.055;
    return Math.min(1, Math.max(0, v));
  };
  return {
    r: gamma(4.0767416621 * lr - 3.3077115913 * mg + 0.2309699292 * sc),
    g: gamma(-1.2684380046 * lr + 2.6097574011 * mg - 0.3413193965 * sc),
    b: gamma(-0.0041960863 * lr - 0.7034186147 * mg + 1.707614701 * sc),
  };
}

function hexToRgb(value: string): Rgb {
  const match = value.match(/^#([\da-f]{6})$/i);
  if (!match) throw new Error(`Not a hex colour: ${value}`);
  const n = Number.parseInt(match[1]!, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

function luminance({ r, g, b }: Rgb): number {
  const [rl, gl, bl] = [r, g, b].map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * rl! + 0.7152 * gl! + 0.0722 * bl!;
}

function contrast(a: number, b: number): number {
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "index.css"), "utf8");
const { root, dark } = parseThemeBlocks(css);

function lumOf(token: string, theme: Map<string, string>): number {
  const value = resolveToken(token, theme);
  return luminance(value.startsWith("#") ? hexToRgb(value) : oklchToRgb(value));
}

/** Text token pairs that must reach 4.5:1: [foreground, background]. */
const TEXT_PAIRS: Array<[string, string]> = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["foreground", "surface-raised"],
  ["foreground", "surface-sunken"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "surface-raised"],
  ["muted-foreground", "surface-sunken"],
  ["primary", "primary-foreground"],
  ["accent-brand-foreground", "accent-brand"],
  ["accent-brand-text", "background"],
  ["accent-brand-text", "card"],
  ["destructive", "card"],
  ["success", "card"],
  ["warning", "card"],
  ["info", "card"],
  ["damage-3hko", "card"],
  ["damage-4hko", "card"],
  ["damage-weak", "card"],
  ["damage-none", "card"],
  /* OHKO and 2HKO are filled pills with dark text, never text colours. */
  ["accent-brand-foreground", "damage-ohko"],
  ["accent-brand-foreground", "damage-2hko"],
];

/** Non-text edges that must reach 3:1: [indicator, background]. */
const EDGE_PAIRS: Array<[string, string]> = [
  ["ring", "background"],
  ["ring", "card"],
  ["accent-brand-text", "muted"],
];

describe.each([
  ["light", root],
  ["dark", dark],
] as const)("design tokens, %s theme", (_name, theme) => {
  it.each(TEXT_PAIRS)("text contrast: --%s on --%s", (fg, bg) => {
    expect(contrast(lumOf(fg, theme), lumOf(bg, theme))).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it.each(EDGE_PAIRS)("edge contrast: --%s on --%s", (fg, bg) => {
    expect(contrast(lumOf(fg, theme), lumOf(bg, theme))).toBeGreaterThanOrEqual(
      3,
    );
  });
});

describe("type badge colours", () => {
  it.each(Object.entries(TYPE_COLORS))(
    "%s fill carries white text at 4.5:1",
    (_type, hex) => {
      expect(
        contrast(luminance(hexToRgb(hex)), luminance({ r: 1, g: 1, b: 1 })),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});
