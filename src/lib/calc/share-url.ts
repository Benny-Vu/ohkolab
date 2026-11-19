import { DEFAULT_NATURE } from "@/data";
import { parseCalcState } from "@/lib/calc/storage";
import { SIDE_IDS, type CalcState, type SideId } from "@/lib/calc/state";
import type { BattleFormat, SideState, Terrain, Weather } from "@/types/battle";
import { STAT_IDS, type PokemonSet } from "@/types/pokemon";

/**
 * The calculator state in a shareable URL: `?c=v1.<base64url>`. The payload is
 * a compact JSON object (short keys, defaults omitted) rather than the full
 * state, so links stay reasonably short. Decoding reuses `parseCalcState`,
 * so every name is re-validated against the roster and bad parts fall back
 * to their defaults. Anything undecodable (wrong version, corrupted base64,
 * broken JSON) is reported as null so the page can reset with a toast.
 */

const SHARE_VERSION = 1;
const PREFIX = `v${SHARE_VERSION}.`;

/** The URL parameter the share link is carried in. */
export const CALC_SHARE_PARAM = "c";

/** Bits of the per-side field flag mask, in `SideState` key order. */
const FIELD_FLAGS = [
  "reflect",
  "lightScreen",
  "auroraVeil",
  "tailwind",
  "helpingHand",
  "friendGuard",
  "stealthRock",
] as const;

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const BASE64_LOOKUP: Record<string, number> = {};
for (const [index, char] of [...BASE64_ALPHABET].entries()) {
  BASE64_LOOKUP[char] = index;
}

type Unknown = Record<string, unknown>;

function isRecord(value: unknown): value is Unknown {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Base64url without padding over bytes, so any Unicode name survives. */
function base64UrlEncode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] as number;
    const b1 = i + 1 < bytes.length ? (bytes[i + 1] as number) : null;
    const b2 = i + 2 < bytes.length ? (bytes[i + 2] as number) : null;
    out += BASE64_ALPHABET[b0 >> 2] ?? "";
    out += BASE64_ALPHABET[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)] ?? "";
    if (b1 === null) break;
    out += BASE64_ALPHABET[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)] ?? "";
    if (b2 === null) break;
    out += BASE64_ALPHABET[(b2 & 63) as number] ?? "";
  }
  return out;
}

/** The bytes a base64url string stands for, or null when it is not one. */
function base64UrlDecode(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const charCount = text.length;
  const byteCount = Math.floor((charCount * 3) / 4);
  const bytes = new Uint8Array(byteCount);
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (const char of text) {
    buffer = (buffer << 6) | (BASE64_LOOKUP[char] as number);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      if (index < byteCount) {
        bytes[index] = (buffer >> bits) & 0xff;
        index += 1;
      }
    }
  }
  return index === byteCount ? bytes : null;
}

function compactSet(set: PokemonSet): Unknown {
  const out: Unknown = { sp: set.species };
  if (set.nickname) out.nk = set.nickname;
  if (set.item) out.i = set.item;
  if (set.ability) out.a = set.ability;
  if (set.nature !== DEFAULT_NATURE) out.n = set.nature;
  if (set.gender) out.g = set.gender;
  const points = STAT_IDS.map((stat) => set.statPoints[stat]);
  if (points.some((value) => value !== 0)) out.e = points;
  if (set.moves.some((move) => move !== null)) out.m = [...set.moves];
  return out;
}

function compactSide(state: CalcState, id: SideId): Unknown {
  const side = state.sides[id];
  const out: Unknown = compactSet(side.set);
  const boosts = (["atk", "def", "spa", "spd", "spe"] as const).map(
    (stat) => side.boosts[stat],
  );
  if (boosts.some((value) => value !== 0)) out.b = boosts;
  if (side.status) out.st = side.status;
  if (side.hpPercent !== 100) out.hp = side.hpPercent;
  if (side.mega) out.me = 1;
  if (side.crits.some((on) => on)) out.c = side.crits.map((on) => (on ? 1 : 0));
  return out;
}

function compactFieldSide(side: SideState): Unknown | null {
  let mask = 0;
  for (const [bit, flag] of FIELD_FLAGS.entries()) {
    if (side[flag]) mask |= 1 << bit;
  }
  if (mask === 0 && side.spikes === 0) return null;
  const out: Unknown = { k: mask };
  if (side.spikes !== 0) out.sk = side.spikes;
  return out;
}

/** The compact payload for a state, as a plain JSON-friendly object. */
export function compactCalcShare(
  state: CalcState,
  format: BattleFormat,
): Unknown {
  const out: Unknown = {
    v: SHARE_VERSION,
    f: format === "singles" ? "s" : "d",
    s: SIDE_IDS.map((id) => compactSide(state, id)),
  };
  // One compact field side per side in order; null means "no conditions".
  const fieldSides = SIDE_IDS.map((id) =>
    compactFieldSide(state.fieldSides[id]),
  );
  if (fieldSides.some((side) => side !== null)) out.fs = fieldSides;
  if (state.weather) out.w = state.weather;
  if (state.terrain) out.t = state.terrain;
  if (state.gravity) out.g = 1;
  if (state.trickRoom) out.tr = 1;
  const selected = SIDE_IDS.indexOf(state.selected.side);
  out.x = [selected, state.selected.slot];
  return out;
}

/** The `?c=` value for a state and format: `v1.<base64url>`. */
export function encodeCalcShare(
  state: CalcState,
  format: BattleFormat,
): string {
  const json = JSON.stringify(compactCalcShare(state, format));
  return PREFIX + base64UrlEncode(new TextEncoder().encode(json));
}

function expandSet(raw: Unknown): Unknown {
  const set: Unknown = { species: raw.sp };
  if (typeof raw.nk === "string") set.nickname = raw.nk;
  set.item = typeof raw.i === "string" ? raw.i : null;
  set.ability = typeof raw.a === "string" ? raw.a : null;
  set.nature = typeof raw.n === "string" ? raw.n : DEFAULT_NATURE;
  if (raw.g === "M" || raw.g === "F" || raw.g === "N") set.gender = raw.g;
  const points = Array.isArray(raw.e) ? raw.e : [];
  const statPoints: Unknown = {};
  for (const [index, stat] of STAT_IDS.entries()) {
    const value = points[index];
    statPoints[stat] = typeof value === "number" ? value : 0;
  }
  set.statPoints = statPoints;
  const moves = Array.isArray(raw.m) ? raw.m : [];
  set.moves = [0, 1, 2, 3].map((slot) => {
    const move = moves[slot];
    return typeof move === "string" ? move : null;
  });
  return set;
}

function expandSide(raw: unknown): Unknown | null {
  if (!isRecord(raw)) return null;
  const side: Unknown = { set: expandSet(raw) };
  const boosts = Array.isArray(raw.b) ? raw.b : [];
  const boostTable: Unknown = {};
  for (const [index, stat] of (
    ["atk", "def", "spa", "spd", "spe"] as const
  ).entries()) {
    const value = boosts[index];
    boostTable[stat] = typeof value === "number" ? value : 0;
  }
  side.boosts = boostTable;
  side.status = typeof raw.st === "string" ? raw.st : null;
  const hp = raw.hp;
  side.hpPercent = typeof hp === "number" ? hp : 100;
  side.mega = raw.me === 1;
  const crits = Array.isArray(raw.c) ? raw.c : [];
  side.crits = [0, 1, 2, 3].map((slot) => crits[slot] === 1);
  return side;
}

function expandFieldSide(raw: unknown): Unknown {
  const side: Unknown = {
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
    stealthRock: false,
    spikes: 0,
  };
  if (!isRecord(raw)) return side;
  const mask = typeof raw.k === "number" ? raw.k : 0;
  for (const [bit, flag] of FIELD_FLAGS.entries()) {
    side[flag] = (mask & (1 << bit)) !== 0;
  }
  if (typeof raw.sk === "number") side.spikes = raw.sk;
  return side;
}

/**
 * The state and format a `?c=` value carries, or null when it cannot be
 * opened (wrong version, corrupted, not this scheme at all).
 */
export function decodeCalcShare(
  param: string | null,
): { state: CalcState; format: BattleFormat } | null {
  if (!param || !param.startsWith(PREFIX)) return null;
  const bytes = base64UrlDecode(param.slice(PREFIX.length));
  if (!bytes) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  if (!isRecord(raw) || raw.v !== SHARE_VERSION || !Array.isArray(raw.s)) {
    return null;
  }

  const sides: Unknown = {};
  const fieldSides: Unknown = {};
  const rawFieldSides = Array.isArray(raw.fs) ? raw.fs : [];
  for (const [index, id] of SIDE_IDS.entries()) {
    const side = expandSide(raw.s[index]);
    if (side === null) return null;
    sides[id] = side;
    const entry = rawFieldSides[index];
    fieldSides[id] = expandFieldSide(isRecord(entry) ? entry : null);
  }

  const selected = Array.isArray(raw.x) ? raw.x : [];
  const selectedSide =
    selected[0] === 1 ? "p2" : selected[0] === 0 ? "p1" : null;
  const selectedSlot = selected[1];

  const state = parseCalcState({
    sides,
    fieldSides,
    weather: (raw.w as Weather | undefined) ?? null,
    terrain: (raw.t as Terrain | undefined) ?? null,
    gravity: raw.g === 1,
    trickRoom: raw.tr === 1,
    selected:
      selectedSide !== null && typeof selectedSlot === "number"
        ? { side: selectedSide, slot: selectedSlot }
        : null,
  });
  const format: BattleFormat = raw.f === "s" ? "singles" : "doubles";
  return { state, format };
}

/** True when the query string carries a share parameter, valid or not. */
export function hasCalcShareParam(search: string): boolean {
  return new URLSearchParams(search).has(CALC_SHARE_PARAM);
}

/** The share state in a query string such as `?c=v1....`, or null. */
export function decodeCalcShareSearch(
  search: string,
): { state: CalcState; format: BattleFormat } | null {
  if (!hasCalcShareParam(search)) return null;
  return decodeCalcShare(new URLSearchParams(search).get(CALC_SHARE_PARAM));
}

/** The absolute `/calc` URL that restores this state and format. */
export function calcShareUrl(
  state: CalcState,
  format: BattleFormat,
  origin: string = typeof window === "undefined"
    ? "https://ohkolab.com"
    : window.location.origin,
): string {
  return `${origin}/calc?${CALC_SHARE_PARAM}=${encodeCalcShare(state, format)}`;
}
