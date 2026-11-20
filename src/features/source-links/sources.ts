import type { SourceName } from "@/lib/telemetry/events";

/**
 * The platforms with marketing links, e.g. `https://ohkolab.com/from/tiktok`
 * in a video description. Add a name here and it starts being recorded.
 */
export const SOURCE_NAMES: ReadonlySet<SourceName> = new Set([
  "tiktok",
  "shorts",
  "reels",
  "reddit",
  "bluesky",
  "note",
]);
