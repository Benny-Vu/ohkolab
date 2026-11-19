/**
 * Rendering the preview images with workers-og.
 *
 * This module is the only workers-og import: everything else is pure. The
 * fonts (the app's heading and body families) are fetched once per Worker
 * isolate and cached in module scope; satori fetches the hotlinked
 * play.pokemonshowdown.com sprites itself.
 */

import { ImageResponse, loadGoogleFont } from "workers-og";

import {
  excerpt,
  type PostData,
  type ProfileData,
  type TeamData,
} from "./cards";
import {
  fetchPostData,
  fetchProfile,
  fetchTeam,
  type FetchLike,
  type SupabaseConfig,
} from "./data";
import { getSpriteUrl } from "./sprites";
import { buildCardHtml, type CardImageContent } from "./templates";
import { TAGLINE } from "./site";
import type { OgImageRequest } from "./routing";

/** A font entry for satori, as ImageResponse's options expect. */
interface FontEntry {
  name: string;
  data: ArrayBuffer;
  weight: number;
  style: "normal";
}

/** The app's heading and body fonts, fetched once and reused. */
let fontsPromise: Promise<FontEntry[]> | undefined;

function loadFonts(): Promise<FontEntry[]> {
  fontsPromise ??= Promise.all([
    loadGoogleFont({ family: "Barlow Semi Condensed", weight: 700 }),
    loadGoogleFont({ family: "IBM Plex Sans", weight: 400 }),
  ]).then(([heading, body]) => [
    {
      name: "Barlow Semi Condensed",
      data: heading,
      weight: 700,
      style: "normal",
    },
    { name: "IBM Plex Sans", data: body, weight: 400, style: "normal" },
  ]);
  return fontsPromise;
}

/** Resolves species names to sprite URLs, dropping unknown ones. */
function spriteUrls(species: readonly string[] | null): string[] {
  if (!species) return [];
  return species
    .map((name) => getSpriteUrl(name))
    .filter((url): url is string => url !== null);
}

/** The fixed brand card: wordmark plus tagline. */
function brandContent(): CardImageContent {
  return { heading: "OHKOLab", body: TAGLINE, spriteUrls: [] };
}

/** The content of each image type, from the same anon reads as the cards. */
async function imageContent(
  image: OgImageRequest,
  config: SupabaseConfig | null,
  fetcher: FetchLike,
): Promise<CardImageContent> {
  if (!config) return brandContent();
  switch (image.kind) {
    case "brand":
      return brandContent();
    case "calc":
      return {
        heading: "Damage Calculator",
        body: "Run damage calculations for Pokémon Champions.",
        spriteUrls: [],
      };
    case "profile":
      return profileContent(
        await fetchProfile(config, fetcher, image.id),
        brandContent,
      );
    case "team":
      return teamContent(
        await fetchTeam(config, fetcher, image.id),
        brandContent,
      );
    case "post":
      return postContent(
        await fetchPostData(config, fetcher, image.id),
        brandContent,
      );
  }
}

function profileContent(
  profile: ProfileData | null,
  fallback: () => CardImageContent,
): CardImageContent {
  if (!profile) return fallback();
  return {
    heading: profile.displayName || `@${profile.username}`,
    body: profile.bio ?? `@${profile.username} on OHKOLab`,
    spriteUrls: profile.avatarSpecies
      ? spriteUrls([profile.avatarSpecies])
      : [],
  };
}

function teamContent(
  team: TeamData | null,
  fallback: () => CardImageContent,
): CardImageContent {
  if (!team || !team.isPublic) return fallback();
  return {
    heading: team.name,
    body: team.species.length > 0 ? team.species.join(" · ") : null,
    spriteUrls: spriteUrls(team.species),
  };
}

function postContent(
  post: PostData | null,
  fallback: () => CardImageContent,
): CardImageContent {
  if (!post) return fallback();
  if (post.groupVisibility !== null && post.groupVisibility !== "public") {
    return fallback();
  }
  return {
    heading: post.authorName ?? "Post on OHKOLab",
    body: excerpt(post.body),
    spriteUrls: spriteUrls(post.teamSpecies),
  };
}

/**
 * Renders one `/og/<type>/<id>.png` request. Any failure — a missing
 * font, an unreachable sprite — answers 500 so the crawler just shows
 * no image, never a broken one.
 */
export async function renderOgImage(
  image: OgImageRequest,
  config: SupabaseConfig | null,
  fetcher: FetchLike,
): Promise<Response> {
  try {
    const content = await imageContent(image, config, fetcher);
    const response = new ImageResponse(buildCardHtml(content), {
      width: 1200,
      height: 630,
      fonts: await loadFonts(),
    });
    return response;
  } catch {
    return new Response("Preview image unavailable", { status: 500 });
  }
}
