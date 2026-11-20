import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveShareCard, shareCardFilename } from "@/lib/share-cards/save";
import { track } from "@/lib/telemetry/analytics";

// The asset loaders are network + canvas-free already, but fetching real
// fonts and sprites belongs to the browser: the export flow is what is
// under test here, with fixed embedded assets.
vi.mock("@/lib/share-cards/assets", () => ({
  loadShareCardFonts: vi.fn(async () => ({
    heading: "data:font/woff2;base64,QQ==",
    wordmarkMedium: null,
    body: null,
    mono: null,
  })),
  loadShareCardSprites: vi.fn(async () => [
    { dataUri: "data:image/png;base64,AA==", pixelated: true },
  ]),
}));

vi.mock("@/lib/telemetry/analytics", () => ({
  track: vi.fn(),
}));

/** A fake <img>: assigning src resolves the load (or fails) on a microtask. */
let nextImageLoads = true;
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 0;
  height = 0;
  src = "";
  constructor() {
    let assigned = "";
    Object.defineProperty(this, "src", {
      get: () => assigned,
      set: (value: string) => {
        assigned = value;
        queueMicrotask(() => {
          if (nextImageLoads) this.onload?.();
          else this.onerror?.();
        });
      },
    });
  }
}

const teamCard = {
  kind: "team" as const,
  eyebrow: "Doubles · 6 Pokémon",
  heading: "Rain team",
  body: null,
  stat: null,
  species: ["Ludicolo"],
};

const createObjectURL = vi.fn(() => "blob:mock");
const revokeObjectURL = vi.fn();
const drawImage = vi.fn();
const toBlobCalls: Array<[BlobCallback, string]> = [];
const downloads: string[] = [];

beforeEach(() => {
  vi.stubGlobal("Image", FakeImage);
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: revokeObjectURL,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback: BlobCallback, type?: string) => {
      toBlobCalls.push([callback, type ?? ""]);
      callback(new Blob(["png"], { type: "image/png" }));
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });
  // The telemetry "language" property is the stored locale choice.
  localStorage.setItem("ohkolab:locale", "ja");
  vi.mocked(track).mockClear();
  downloads.length = 0;
  toBlobCalls.length = 0;
  drawImage.mockClear();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  nextImageLoads = true;
});

describe("shareCardFilename", () => {
  it("names the download after the kind and format", () => {
    expect(shareCardFilename("team", "1080x1920")).toBe(
      "ohkolab-team-1080x1920.png",
    );
    expect(shareCardFilename("post", "1200x630")).toBe(
      "ohkolab-post-1200x630.png",
    );
  });
});

describe("saveShareCard", () => {
  it("rasterizes the card, downloads the PNG and reports the save", async () => {
    await saveShareCard(teamCard, "1080x1920");

    // The SVG went through a blob URL into the image...
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalled();
    // ... onto a canvas of the format's exact size...
    expect(drawImage).toHaveBeenCalledWith(
      expect.any(FakeImage),
      0,
      0,
      1080,
      1920,
    );
    // ... encoded as PNG ...
    expect(toBlobCalls[0]?.[1]).toBe("image/png");
    // ... and handed to the browser as a download with the expected name.
    expect(downloads).toEqual(["ohkolab-team-1080x1920.png"]);
    expect(track).toHaveBeenCalledWith("share_card_saved", {
      kind: "team",
      format: "1080x1920",
      language: "ja",
    });
  });

  it("uses the landscape canvas size for the landscape format", async () => {
    await saveShareCard(teamCard, "1200x630");
    expect(drawImage).toHaveBeenCalledWith(
      expect.any(FakeImage),
      0,
      0,
      1200,
      630,
    );
    expect(downloads).toEqual(["ohkolab-team-1200x630.png"]);
  });

  it("rejects and reports nothing when the card cannot be rendered", async () => {
    nextImageLoads = false;
    await expect(saveShareCard(teamCard, "1200x630")).rejects.toThrow();
    expect(downloads).toEqual([]);
    expect(track).not.toHaveBeenCalled();
  });
});
