import { describe, expect, it } from "vitest";

import {
  BRAND_IMAGE_URL,
  calcCard,
  excerpt,
  genericCard,
  homeCard,
  postCard,
  profileCard,
  teamCard,
  type PostData,
  type ProfileData,
  type TeamData,
} from "./cards";

const URL = "https://ohkolab.com/";

describe("fixed cards", () => {
  it("the generic card is the site's fixed card", () => {
    const card = genericCard(URL);
    expect(card.title).toBe("OHKOLab");
    expect(card.description).toBe(
      "Damage calculator, team builder and community for Pokémon Champions. Unofficial fan project.",
    );
    expect(card.imageUrl).toBe(BRAND_IMAGE_URL);
    expect(card.url).toBe(URL);
  });

  it("home and tool pages share the generic card", () => {
    expect(homeCard("https://ohkolab.com/")).toEqual(
      genericCard("https://ohkolab.com/"),
    );
    expect(homeCard("https://ohkolab.com/meta")).toEqual(
      genericCard("https://ohkolab.com/meta"),
    );
  });

  it("the calc card is generic-but-clear, with the calc image", () => {
    const card = calcCard("https://ohkolab.com/calc?species=Garchomp");
    expect(card.title).toContain("Damage Calculator");
    expect(card.description).toContain("damage calculations");
    expect(card.imageUrl).toBe("https://ohkolab.com/og/calc/default.png");
    expect(card.url).toBe("https://ohkolab.com/calc?species=Garchomp");
  });
});

describe("profileCard", () => {
  const profile: ProfileData = {
    username: "benny",
    displayName: "Benny",
    avatarSpecies: "Garchomp",
    bio: "Doubles grinder.",
  };

  it("builds the card from name, bio and avatar Pokémon", () => {
    const card = profileCard("https://ohkolab.com/u/benny", profile);
    expect(card.title).toBe("Benny (@benny)");
    expect(card.description).toBe("Doubles grinder. Avatar Pokémon: Garchomp.");
    expect(card.imageUrl).toBe("https://ohkolab.com/og/profile/benny.png");
  });

  it("falls back to the username when there is no display name", () => {
    const card = profileCard(URL, { ...profile, displayName: null });
    expect(card.title).toBe("@benny (@benny)");
  });

  it("works without a bio or avatar", () => {
    const card = profileCard(URL, {
      ...profile,
      bio: null,
      avatarSpecies: null,
    });
    expect(card.description).toBe("View Benny's profile on OHKOLab.");
  });

  it("falls back to the username in the description when there is no display name", () => {
    const card = profileCard(URL, {
      ...profile,
      displayName: null,
      bio: null,
      avatarSpecies: null,
    });
    expect(card.description).toBe("View @benny's profile on OHKOLab.");
  });

  it("gives unknown profiles the generic card", () => {
    expect(profileCard(URL, null)).toEqual(genericCard(URL));
  });
});

describe("teamCard", () => {
  const team: TeamData = {
    id: "3f2c8a4e-1b2d-4c5a-9e8f-7a6b5c4d3e2f",
    name: "Sand Balance",
    isPublic: true,
    gameTeamId: null,
    species: ["Garchomp", "Rotom-Wash", "Talonflame"],
  };

  it("titles with the team name, describes with the species, images per team", () => {
    const card = teamCard(
      "https://ohkolab.com/teams/3f2c8a4e-1b2d-4c5a-9e8f-7a6b5c4d3e2f",
      team,
    );
    expect(card.title).toBe("Sand Balance");
    expect(card.description).toBe("Garchomp, Rotom-Wash, Talonflame");
    expect(card.imageUrl).toBe(
      "https://ohkolab.com/og/team/3f2c8a4e-1b2d-4c5a-9e8f-7a6b5c4d3e2f.png",
    );
  });

  it("handles an empty team", () => {
    const card = teamCard(URL, { ...team, species: [] });
    expect(card.description).toContain("team on OHKOLab");
  });

  it("appends the Champions team ID to the description when there is one", () => {
    const card = teamCard(URL, { ...team, gameTeamId: "AbCd123456" });
    expect(card.description).toBe(
      "Garchomp, Rotom-Wash, Talonflame · Champions team ID: AbCd123456",
    );
  });

  it("gives private teams the generic card, even if a row leaks through", () => {
    expect(teamCard(URL, { ...team, isPublic: false })).toEqual(
      genericCard(URL),
    );
  });

  it("gives unknown teams the generic card", () => {
    expect(teamCard(URL, null)).toEqual(genericCard(URL));
  });
});

describe("postCard", () => {
  const base: PostData = {
    id: "9c8b7a6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d",
    body: "Just hit top 100 with this team.",
    authorName: "Benny",
    groupVisibility: null,
    teamSpecies: null,
    approvedImagePath: null,
  };

  it("titles with the author, describes with the body excerpt", () => {
    const card = postCard(
      "https://ohkolab.com/post/9c8b7a6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d",
      base,
    );
    expect(card.title).toBe("Benny");
    expect(card.description).toBe("Just hit top 100 with this team.");
    expect(card.imageUrl).toBe(BRAND_IMAGE_URL);
  });

  it("uses the attached team's image when there is one", () => {
    const card = postCard(URL, {
      ...base,
      teamSpecies: ["Garchomp", "Rotom-Wash"],
    });
    expect(card.imageUrl).toBe(
      "https://ohkolab.com/og/post/9c8b7a6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d.png",
    );
  });

  it("uses an approved image when there is no team", () => {
    const card = postCard(URL, {
      ...base,
      approvedImagePath: "uid/post-id/image-id.webp",
    });
    expect(card.imageUrl).toBe(
      "https://img.ohkolab.com/uid/post-id/image-id.webp",
    );
  });

  it("never uses a post image when a team is attached — the team wins", () => {
    const card = postCard(URL, {
      ...base,
      teamSpecies: ["Garchomp"],
      approvedImagePath: "uid/post-id/image-id.webp",
    });
    expect(card.imageUrl).toBe(
      "https://ohkolab.com/og/post/9c8b7a6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d.png",
    );
  });

  it("gives posts in invite-only groups the generic card", () => {
    const card = postCard(URL, { ...base, groupVisibility: "invite_only" });
    expect(card).toEqual(genericCard(URL));
  });

  it("fails closed on an unknown group visibility", () => {
    expect(postCard(URL, { ...base, groupVisibility: "unknown" })).toEqual(
      genericCard(URL),
    );
    expect(postCard(URL, { ...base, groupVisibility: "" })).toEqual(
      genericCard(URL),
    );
  });

  it("serves public-group posts normally", () => {
    const card = postCard(URL, { ...base, groupVisibility: "public" });
    expect(card.title).toBe("Benny");
  });

  it("gives unknown or removed posts the generic card", () => {
    expect(postCard(URL, null)).toEqual(genericCard(URL));
  });

  it("falls back to a neutral title without an author name", () => {
    const card = postCard(URL, { ...base, authorName: null });
    expect(card.title).toBe("Post on OHKOLab");
  });
});

describe("excerpt", () => {
  it("keeps short bodies untouched", () => {
    expect(excerpt("Hello world")).toBe("Hello world");
  });

  it("collapses whitespace and trims", () => {
    expect(excerpt("  a\n\nb\t c  ")).toBe("a b c");
  });

  it("cuts around 150 characters at a word boundary", () => {
    const words = "word ".repeat(60).trim();
    const cut = excerpt(words);
    expect(cut.length).toBeLessThanOrEqual(151);
    expect(cut.endsWith("…")).toBe(true);
    expect(cut).not.toMatch(/…\w/);
  });

  it("hard-cuts when there is no good word boundary", () => {
    const long = "x".repeat(200);
    const cut = excerpt(long);
    expect(cut.length).toBe(151);
    expect(cut.endsWith("…")).toBe(true);
  });

  it("leaves 150-character bodies whole", () => {
    const exact = "a".repeat(150);
    expect(excerpt(exact)).toBe(exact);
  });
});
