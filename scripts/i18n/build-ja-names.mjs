#!/usr/bin/env node
/**
 * Builds `src/data/i18n/ja-names.json`: Japanese display names for the
 * Pokémon Champions roster (species, moves, abilities, items, types,
 * natures), plus Japanese flavour-text descriptions for the Champions
 * abilities and items, all keyed by the ids `@/data` uses.
 *
 * Source: PokéAPI's data CSVs (https://github.com/PokeAPI/pokeapi,
 * data/v2/csv, BSD-3 licence). Japanese names come from
 * `local_language_id` 11 ("ja"); for plain names it is identical to 1
 * ("ja-Hrkt"), which is only used as a fallback. Descriptions come from
 * `ability_flavor_text.csv` and `item_flavor_text.csv`, `language_id` 11
 * only, taking the most recent version group each entry has. The script
 * prints every roster id it could not match; those fall back to English
 * at runtime.
 *
 * Run by hand (no arguments, no dependencies beyond Node and the
 * installed packages):  node scripts/i18n/build-ja-names.mjs
 * The generated JSON is committed, so the app never re-runs this.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Generations } from "@smogon/calc";

const CSV_BASE =
  "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/";

const LANG_EN = 9;
const LANG_JA = 11;
const LANG_JA_KANA = 1;

// Mirrors the hidden entries in src/data/species.ts and src/data/moves.ts.
const HIDDEN_SPECIES = new Set(["Aegislash-Both"]);
const NO_MOVE = "(No Move)";

// The canonical type list; keep in sync with TYPE_NAMES in
// src/types/pokemon.ts. The parity test in src/data guards against drift.
const TYPE_NAMES = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
];

// Official regional prefixes, as PokéAPI spells the full form names.
const REGIONAL_PREFIX = {
  Alola: "Alolan",
  Galar: "Galarian",
  Hisui: "Hisuian",
  Paldea: "Paldean",
};

// Words PokéAPI puts between the form name and the species name, e.g.
// "Masterpiece Form Sinistcha", "Blue Plumage Squawkabilly".
const FORM_WORDS = [
  "Form",
  "Forme",
  "Pattern",
  "Size",
  "Mode",
  "Plumage",
  "Breed",
  "Flower",
];

/**
 * The same normalization the app's search uses: folds accents and
 * full-width characters, lower-cases, drops everything that is not a
 * letter or a digit. Applies to ENGLISH keys only; Japanese values are
 * stored exactly as PokéAPI has them.
 */
function normalize(text) {
  return text
    .normalize("NFKC")
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Minimal RFC-4180 CSV parser (quoted fields, doubled quotes). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop the header row.
  return rows.slice(1).filter((entry) => entry.length > 1);
}

async function fetchCsv(name) {
  const response = await fetch(CSV_BASE + name);
  if (!response.ok) {
    throw new Error(`Could not fetch ${name}: HTTP ${response.status}`);
  }
  return parseCsv(await response.text());
}

/**
 * Rows of a `<kind>_flavor_text.csv` (id, version_group_id, language_id,
 * flavor_text) keyed by the normalized English name from the matching
 * `<kind>_names.csv`, mapped to the newest Japanese flavour text: among
 * one entry's `language_id` 11 rows the highest version_group_id wins,
 * as PokéAPI numbers version groups in release order. Items the newest
 * games dropped (Mega Stones) thus keep their latest available text.
 * Newlines inside the quoted CSV fields become single spaces.
 */
function jaFlavorByEnglishName(flavorRows, nameRows) {
  const en = new Map();
  for (const [id, lang, name] of nameRows) {
    if (lang === String(LANG_EN)) en.set(id, normalize(name));
  }
  const chosen = new Map();
  for (const [id, versionGroup, lang, text] of flavorRows) {
    if (lang !== String(LANG_JA)) continue;
    const english = en.get(id);
    if (!english) continue;
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const group = Number(versionGroup);
    const current = chosen.get(english);
    if (!current || group > current[0]) chosen.set(english, [group, clean]);
  }
  const map = new Map();
  for (const [english, [, text]] of chosen) map.set(english, text);
  return map;
}

/**
 * Rows of a `<kind>_names.csv` (id, local_language_id, name) keyed by the
 * normalized English name, mapped to the Japanese name. Also counts how
 * many Japanese names came from the kana fallback and how often the two
 * Japanese variants disagree, for the run report.
 */
function jaByEnglishName(rows, stats) {
  const en = new Map();
  const ja = new Map();
  const jaKana = new Map();
  for (const [id, lang, name] of rows) {
    if (lang === String(LANG_EN)) en.set(id, name);
    else if (lang === String(LANG_JA)) ja.set(id, name);
    else if (lang === String(LANG_JA_KANA)) jaKana.set(id, name);
  }
  for (const [id, kana] of jaKana) {
    if (ja.has(id) && ja.get(id) !== kana) stats.jaVariantsDiffer++;
  }
  const map = new Map();
  for (const [id, english] of en) {
    const japanese = ja.get(id) ?? jaKana.get(id);
    if (!japanese) continue;
    if (ja.get(id) === undefined) stats.kanaFallback++;
    map.set(normalize(english), japanese);
  }
  return map;
}

/**
 * `pokemon_form_names.csv` keyed by the normalized full English name (the
 * pokemon_name column, form_name as a fallback) mapped to the Japanese
 * form name. The Japanese pokemon_name column is empty in PokéAPI, so the
 * Japanese form_name is what we get.
 */
function jaFormByEnglishName(rows, stats) {
  const en = new Map();
  const ja = new Map();
  const jaKana = new Map();
  for (const [id, lang, formName, pokemonName] of rows) {
    if (lang === String(LANG_EN)) {
      const english = pokemonName || formName;
      if (english) en.set(id, english);
    } else if (lang === String(LANG_JA)) {
      if (formName) ja.set(id, formName);
    } else if (lang === String(LANG_JA_KANA)) {
      if (formName) jaKana.set(id, formName);
    }
  }
  const map = new Map();
  for (const [id, english] of en) {
    const japanese = ja.get(id) ?? jaKana.get(id);
    if (!japanese) continue;
    if (ja.get(id) === undefined) stats.kanaFallback++;
    map.set(normalize(english), japanese);
  }
  return map;
}

/** The English spellings a roster name might appear under, best first. */
function candidateNames(name) {
  const out = [name];
  if (!name.includes("-")) return out;
  const [base, ...parts] = name.split("-");
  const expand = (part) =>
    part === "F" ? "Female" : part === "M" ? "Male" : part;
  const forme = parts.map(expand).join(" ");
  out.push(`${base} ${forme}`, `${forme} ${base}`);
  for (const word of FORM_WORDS) {
    out.push(`${forme} ${word} ${base}`, `${base} ${word} ${forme}`);
  }
  out.push(`${base} family of ${forme}`);
  if (parts.includes("Mega")) {
    const rest = parts
      .filter((part) => part !== "Mega")
      .map(expand)
      .join(" ");
    out.push(`Mega ${base}${rest ? ` ${rest}` : ""}`);
    // PokéAPI drops the gender word for some Mega entries ("Mega Meowstic").
    out.push(`Mega ${base}`);
  }
  for (const [suffix, prefix] of Object.entries(REGIONAL_PREFIX)) {
    if (!parts.includes(suffix)) continue;
    const rest = parts.filter((part) => part !== suffix).join(" ");
    out.push(`${prefix} ${base}${rest ? ` ${rest}` : ""}`);
    out.push(`${prefix} ${base}${rest ? ` ${rest}` : ""} Breed`);
  }
  return out;
}

/** Mega names keep their X/Y/Z suffix; PokéAPI mixes widths, so pin them. */
function fullWidthMegaSuffix(name) {
  const suffix = { X: "Ｘ", Y: "Ｙ", Z: "Ｚ" };
  const last = name.at(-1);
  if (name.startsWith("メガ") && last && suffix[last]) {
    return name.slice(0, -1) + suffix[last];
  }
  return name;
}

/**
 * The Japanese display name for one roster species. Form names come back
 * either as full names ("メガリザードンＸ", "ヒートロトム") or as form
 * descriptions ("ヒスイのすがた", "ちいさいサイズ"); a description is
 * appended to the base species name in full-width parentheses.
 */
function jaForSpecies(name, speciesByEn, formsByEn, report) {
  const baseName = name.includes("-") ? name.split("-")[0] : name;
  const baseJa = speciesByEn.get(normalize(baseName));

  for (const candidate of candidateNames(name)) {
    const key = normalize(candidate);
    const formJa = formsByEn.get(key);
    if (formJa) {
      if (!baseJa || formJa.includes(baseJa))
        return fullWidthMegaSuffix(formJa);
      return `${baseJa}（${formJa}）`;
    }
    // A plain species name, even one with a hyphen ("Kommo-o"). Form
    // candidates never collide with species keys, so this only fires for
    // the roster entry's own name.
    if (key === normalize(name)) {
      const speciesJa = speciesByEn.get(key);
      if (speciesJa) return speciesJa;
    }
  }

  // Compose missing Mega names from the base species: メガ + name (+ Ｘ/Ｙ/Ｚ).
  if (/-Mega(-|$)/.test(name) && baseJa) {
    const suffix = { X: "Ｘ", Y: "Ｙ", Z: "Ｚ" }[name.at(-1) ?? ""];
    report.composed.push(name);
    return `メガ${baseJa}${suffix ?? ""}`;
  }

  report.missing.push(name);
  return undefined;
}

function jaByLookup(entries, byEn) {
  const result = new Map();
  for (const entry of entries) {
    const ja = byEn.get(normalize(entry.name));
    if (ja) result.set(entry.id, ja);
  }
  return result;
}

function sorted(map) {
  return Object.fromEntries(
    [...map.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );
}

// --- The run -----------------------------------------------------------------

const gen = Generations.get(0);

const species = [...gen.species]
  .filter((entry) => !HIDDEN_SPECIES.has(entry.name))
  .map((entry) => ({ id: entry.id, name: entry.name }));
const moves = [...gen.moves]
  .filter((entry) => entry.name !== NO_MOVE)
  .map((entry) => ({ id: entry.id, name: entry.name }));
const abilities = [...gen.abilities].map((entry) => ({
  id: entry.id,
  name: entry.name,
}));
const items = [...gen.items].map((entry) => ({
  id: entry.id,
  name: entry.name,
}));
const natures = [...gen.natures].map((entry) => ({
  id: normalize(entry.name),
  name: entry.name,
}));
const types = TYPE_NAMES.map((name) => ({ id: normalize(name), name }));

console.log(
  `Roster: ${species.length} species, ${moves.length} moves, ` +
    `${abilities.length} abilities, ${items.length} items, ` +
    `${types.length} types, ${natures.length} natures`,
);

const stats = { kanaFallback: 0, jaVariantsDiffer: 0 };

const [
  speciesNames,
  moveNames,
  abilityNames,
  itemNames,
  typeNames,
  natureNames,
  formNames,
  abilityFlavor,
  itemFlavor,
] = await Promise.all([
  fetchCsv("pokemon_species_names.csv"),
  fetchCsv("move_names.csv"),
  fetchCsv("ability_names.csv"),
  fetchCsv("item_names.csv"),
  fetchCsv("type_names.csv"),
  fetchCsv("nature_names.csv"),
  fetchCsv("pokemon_form_names.csv"),
  fetchCsv("ability_flavor_text.csv"),
  fetchCsv("item_flavor_text.csv"),
]);

const speciesByEn = jaByEnglishName(speciesNames, stats);
const formsByEn = jaFormByEnglishName(formNames, stats);

const speciesReport = { missing: [], composed: [] };
const speciesMap = new Map();
for (const entry of species) {
  const ja = jaForSpecies(entry.name, speciesByEn, formsByEn, speciesReport);
  if (ja) speciesMap.set(entry.id, ja);
}

const sections = {
  species: speciesMap,
  move: jaByLookup(moves, jaByEnglishName(moveNames, stats)),
  ability: jaByLookup(abilities, jaByEnglishName(abilityNames, stats)),
  item: jaByLookup(items, jaByEnglishName(itemNames, stats)),
  type: jaByLookup(types, jaByEnglishName(typeNames, stats)),
  nature: jaByLookup(natures, jaByEnglishName(natureNames, stats)),
  abilityDescription: jaByLookup(
    abilities,
    jaFlavorByEnglishName(abilityFlavor, abilityNames),
  ),
  itemDescription: jaByLookup(
    items,
    jaFlavorByEnglishName(itemFlavor, itemNames),
  ),
};

const rosters = {
  species,
  move: moves,
  ability: abilities,
  item: items,
  type: types,
  nature: natures,
  abilityDescription: abilities,
  itemDescription: items,
};

const data = {
  species: sorted(sections.species),
  move: sorted(sections.move),
  ability: sorted(sections.ability),
  item: sorted(sections.item),
  type: sorted(sections.type),
  nature: sorted(sections.nature),
  abilityDescription: sorted(sections.abilityDescription),
  itemDescription: sorted(sections.itemDescription),
};

const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "src",
  "data",
  "i18n",
  "ja-names.json",
);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log(`\nWrote ${outPath}`);
for (const [kind, map] of Object.entries(sections)) {
  const total = rosters[kind].length;
  const composed =
    kind === "species" ? ` (${speciesReport.composed.length} composed)` : "";
  console.log(`${kind}: ${map.size}/${total} matched${composed}`);
}

console.log(
  `\nJapanese variants (ja vs ja-Hrkt) differing: ${stats.jaVariantsDiffer}` +
    `, names only in ja-Hrkt: ${stats.kanaFallback}`,
);

for (const kind of Object.keys(rosters)) {
  const missing = rosters[kind]
    .filter((entry) => !sections[kind].has(entry.id))
    .map((entry) => entry.name);
  if (missing.length > 0) {
    const what = kind.endsWith("Description") ? "description" : "name";
    console.log(`\nNo Japanese ${what} for ${kind}: ${missing.join(", ")}`);
  }
}
if (speciesReport.composed.length > 0) {
  console.log(`\nComposed Mega names: ${speciesReport.composed.join(", ")}`);
}

// The two verification species from the wave brief.
console.log(
  `\nVerification: Garchomp = ${data.species.garchomp}, ` +
    `Kingambit = ${data.species.kingambit}`,
);
