/**
 * Preview cards: the title/description/image a crawler sees, built from the
 * data the Worker could read through the anon role.
 *
 * Pure: every builder takes validated data (or null) and returns a card.
 * The rules here are the second line of defence on top of row-level
 * security — the anon queries in data.ts already return nothing for
 * private teams, invite-only group posts and unapproved images, but the
 * builders re-check so the generic card is served even if a policy ever
 * widens.
 */

import { IMAGE_CDN_BASE, SITE_NAME, SITE_URL, TAGLINE } from "./site";

/** What a crawler gets: Open Graph + Twitter Card content for one page. */
export interface OgCard {
  /** og:title / twitter:title. */
  title: string;
  /** og:description / twitter:description. */
  description: string;
  /** Absolute og:image / twitter:image URL. */
  imageUrl: string;
  /** The shared page's absolute URL (og:url, canonical). */
  url: string;
}

/** The fixed brand image, used by the generic card. */
export const BRAND_IMAGE_URL = `${SITE_URL}/og/brand/ohkolab.png`;

/**
 * The card for pages without specific content: unknown paths, private or
 * invite-only content, anything the anon role cannot read. The same fixed
 * card as home and the tool pages, so it never reveals whether a post,
 * team or profile exists.
 */
export function genericCard(url: string): OgCard {
  return {
    title: SITE_NAME,
    description: TAGLINE,
    imageUrl: BRAND_IMAGE_URL,
    url,
  };
}

/** The home page and the tool pages (team list, metagame, legal...). */
export function homeCard(url: string): OgCard {
  return genericCard(url);
}

/**
 * The damage calculator. The URL itself carries the calc state, so the
 * card is deliberately generic — it names the tool without trying to
 * describe the state.
 */
export function calcCard(url: string): OgCard {
  return {
    title: "Damage Calculator — OHKOLab",
    description:
      "Run damage calculations for Pokémon Champions with OHKOLab's calculator.",
    imageUrl: `${SITE_URL}/og/calc/default.png`,
    url,
  };
}

/** A profile row as the anon role can read it (profiles table). */
export interface ProfileData {
  username: string;
  displayName: string | null;
  avatarSpecies: string | null;
  bio: string | null;
}

/** The card for `/u/:username`. Unknown or unreadable → the generic card. */
export function profileCard(url: string, profile: ProfileData | null): OgCard {
  if (!profile) return genericCard(url);
  const name = profile.displayName || `@${profile.username}`;
  const parts: string[] = [];
  if (profile.bio) parts.push(profile.bio);
  if (profile.avatarSpecies) {
    parts.push(`Avatar Pokémon: ${profile.avatarSpecies}.`);
  }
  const description = parts.join(" ") || `View ${name}'s profile on OHKOLab.`;
  return {
    title: `${name} (@${profile.username})`,
    description,
    imageUrl: `${SITE_URL}/og/profile/${profile.username}.png`,
    url,
  };
}

/** A team row as the anon role can read it (teams table). */
export interface TeamData {
  id: string;
  name: string;
  /** Private teams never get here through RLS; re-checked anyway. */
  isPublic: boolean;
  /** The Champions team ID shown in the description, when the team has one. */
  gameTeamId: string | null;
  /** The members' species names, in team order. */
  species: string[];
}

/** The card for `/teams/:teamId`. Private or unreadable → the generic card. */
export function teamCard(url: string, team: TeamData | null): OgCard {
  if (!team || !team.isPublic) return genericCard(url);
  const description =
    team.species.length > 0
      ? team.species.join(", ")
      : "A Pokémon Champions team on OHKOLab.";
  const idSuffix = team.gameTeamId
    ? ` · Champions team ID: ${team.gameTeamId}`
    : "";
  return {
    title: team.name,
    description: `${description}${idSuffix}`,
    imageUrl: `${SITE_URL}/og/team/${team.id}.png`,
    url,
  };
}

/**
 * A post with everything the card needs, already fetched through the anon
 * role: the author's public name, the group's visibility (null on the
 * main feed), the species of an attached team (when the attachment is a
 * team), and the first approved image's CDN path.
 */
export interface PostData {
  id: string;
  body: string;
  /** The author's display name, or "@username"; null when unreadable. */
  authorName: string | null;
  /** The post's group visibility, or null on the main feed. */
  groupVisibility: string | null;
  /** Species names of the attached team, or null without one. */
  teamSpecies: string[] | null;
  /** The first approved image's path on the IMAGE_CDN_BASE host. */
  approvedImagePath: string | null;
}

/** The card for `/post/:postId`. Anything unreadable → the generic card. */
export function postCard(url: string, post: PostData | null): OgCard {
  if (!post) return genericCard(url);
  // Defence in depth on top of the posts RLS policy: posts in invite-only
  // groups are already invisible to the anon role, but a group post that
  // somehow reads back never gets a content card.
  if (post.groupVisibility !== null && post.groupVisibility !== "public") {
    return genericCard(url);
  }
  const title = post.authorName ?? "Post on OHKOLab";
  // The image rules: an attached team gets the team's card image (rendered
  // from the post, since attachments are snapshots without a team id);
  // otherwise the first approved image, never a pending or rejected one
  // (data.ts only returns approved images in the first place); otherwise
  // the brand image.
  let imageUrl = BRAND_IMAGE_URL;
  if (post.teamSpecies) {
    imageUrl = `${SITE_URL}/og/post/${post.id}.png`;
  } else if (post.approvedImagePath) {
    imageUrl = `${IMAGE_CDN_BASE}/${post.approvedImagePath}`;
  }
  return {
    title,
    description: excerpt(post.body),
    imageUrl,
    url,
  };
}

/**
 * The first ~150 characters of a post body, cut at a word boundary and
 * marked with an ellipsis. Whitespace is collapsed so newlines don't turn
 * the preview into one long line of padding.
 */
export function excerpt(body: string, maxLength = 150): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const head = lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${head.trimEnd()}…`;
}
