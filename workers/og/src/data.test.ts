import { describe, expect, it } from "vitest";

import {
  fetchPostData,
  fetchProfile,
  fetchTeam,
  parseApprovedImagePath,
  parseGroupVisibility,
  parsePostRow,
  parseProfileRow,
  parseTeamAttachmentSpecies,
  parseTeamRow,
  type FetchLike,
} from "./data";

const CONFIG = { url: "https://example.supabase.co", anonKey: "anon-key" };

/** A response for the stub fetcher. */
interface StubResponse {
  url: string;
  json: unknown;
  ok?: boolean;
}

/**
 * A fetcher stub: answers from a script of responses, records every call.
 * Unlisted URLs answer 200 with an empty array.
 */
function stubFetch(script: StubResponse[]): {
  fetcher: FetchLike;
  calls: { url: string; headers: Record<string, string> }[];
} {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fetcher: FetchLike = async (input, init) => {
    calls.push({ url: input, headers: init?.headers ?? {} });
    const entry = script.find((response) => response.url === input);
    const ok = entry?.ok ?? true;
    return {
      ok,
      status: ok ? 200 : 400,
      json: async () => entry?.json ?? [],
    };
  };
  return { fetcher, calls };
}

describe("parseProfileRow", () => {
  it("accepts a full profile row", () => {
    expect(
      parseProfileRow({
        username: "benny",
        display_name: "Benny",
        avatar_species: "Garchomp",
        bio: "Hi",
      }),
    ).toEqual({
      username: "benny",
      displayName: "Benny",
      avatarSpecies: "Garchomp",
      bio: "Hi",
    });
  });

  it("accepts null optional fields", () => {
    expect(
      parseProfileRow({
        username: "benny",
        display_name: null,
        avatar_species: null,
        bio: null,
      }),
    ).toEqual({
      username: "benny",
      displayName: null,
      avatarSpecies: null,
      bio: null,
    });
  });

  it("rejects rows without a username", () => {
    expect(parseProfileRow({ display_name: "Benny" })).toBeNull();
    expect(parseProfileRow(null)).toBeNull();
    expect(parseProfileRow("benny")).toBeNull();
  });
});

describe("parseTeamRow", () => {
  const row = {
    id: "3f2c8a4e-1b2d-4c5a-9e8f-7a6b5c4d3e2f",
    name: "Sand Balance",
    is_public: true,
    data: [{ species: "Garchomp" }, { species: "Rotom-Wash" }],
  };

  it("reads a public team and its species in order", () => {
    expect(parseTeamRow(row)).toEqual({
      id: row.id,
      name: "Sand Balance",
      isPublic: true,
      species: ["Garchomp", "Rotom-Wash"],
    });
  });

  it("rejects private teams even though RLS should keep them away", () => {
    expect(parseTeamRow({ ...row, is_public: false })).toBeNull();
  });

  it("rejects malformed rows", () => {
    expect(parseTeamRow({ ...row, data: "nope" })).toBeNull();
    expect(parseTeamRow({ ...row, data: [{ species: "" }] })).toBeNull();
    expect(
      parseTeamRow({ ...row, data: [{ item: "Choice Band" }] }),
    ).toBeNull();
    expect(parseTeamRow(null)).toBeNull();
  });
});

describe("parsePostRow", () => {
  it("reads the fields the card needs", () => {
    const row = {
      id: "9c8b7a6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d",
      body: "Hello",
      attachment: null,
      group_id: null,
      author_id: "author-uuid",
    };
    expect(parsePostRow(row)).toEqual({
      id: row.id,
      body: "Hello",
      attachment: null,
      groupId: null,
      authorId: "author-uuid",
    });
  });

  it("rejects rows without id or body", () => {
    expect(parsePostRow({ id: "x" })).toBeNull();
    expect(parsePostRow(null)).toBeNull();
  });
});

describe("parseTeamAttachmentSpecies", () => {
  it("reads the species of a team attachment", () => {
    expect(
      parseTeamAttachmentSpecies({
        kind: "team",
        name: "Sand Balance",
        format: "doubles",
        members: [{ species: "Garchomp" }, { species: "Rotom-Wash" }],
      }),
    ).toEqual(["Garchomp", "Rotom-Wash"]);
  });

  it("rejects other attachments and malformed members", () => {
    expect(parseTeamAttachmentSpecies({ kind: "calc-result" })).toBeNull();
    expect(parseTeamAttachmentSpecies(null)).toBeNull();
    expect(
      parseTeamAttachmentSpecies({ kind: "team", members: [] }),
    ).toBeNull();
    expect(
      parseTeamAttachmentSpecies({ kind: "team", members: [{ species: 5 }] }),
    ).toBeNull();
  });
});

describe("parseApprovedImagePath", () => {
  it("reads the public path of an approved image", () => {
    expect(
      parseApprovedImagePath({
        public_path: "uid/post-id/image-id.webp",
        status: "approved",
      }),
    ).toBe("uid/post-id/image-id.webp");
  });

  it("rejects anything that is not approved with a path", () => {
    expect(
      parseApprovedImagePath({ public_path: "p", status: "pending" }),
    ).toBeNull();
    expect(
      parseApprovedImagePath({ public_path: "p", status: "rejected" }),
    ).toBeNull();
    expect(
      parseApprovedImagePath({ public_path: "p", status: "blocked" }),
    ).toBeNull();
    // Approved but no public path yet: nothing to show.
    expect(
      parseApprovedImagePath({ public_path: null, status: "approved" }),
    ).toBeNull();
    expect(parseApprovedImagePath(null)).toBeNull();
  });
});

describe("parseGroupVisibility", () => {
  it("reads the visibility", () => {
    expect(parseGroupVisibility({ visibility: "public" })).toBe("public");
    expect(parseGroupVisibility({ visibility: "invite_only" })).toBe(
      "invite_only",
    );
  });

  it("rejects malformed rows", () => {
    expect(parseGroupVisibility({})).toBeNull();
    expect(parseGroupVisibility(null)).toBeNull();
  });
});

describe("fetchProfile", () => {
  it("queries by username with the anon key and reads the row", async () => {
    const { fetcher, calls } = stubFetch([
      {
        url: `${CONFIG.url}/rest/v1/profiles?select=username,display_name,avatar_species,bio&username=eq.benny`,
        json: [
          {
            username: "benny",
            display_name: "Benny",
            avatar_species: null,
            bio: "Hi",
          },
        ],
      },
    ]);
    const profile = await fetchProfile(CONFIG, fetcher, "benny");
    expect(profile).toEqual({
      username: "benny",
      displayName: "Benny",
      avatarSpecies: null,
      bio: "Hi",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].headers.apikey).toBe("anon-key");
    expect(calls[0].headers.Authorization).toBe("Bearer anon-key");
  });

  it("returns null for an unknown profile", async () => {
    const { fetcher } = stubFetch([]);
    expect(await fetchProfile(CONFIG, fetcher, "nobody")).toBeNull();
  });

  it("returns null on a failed request", async () => {
    const { fetcher, calls } = stubFetch([
      {
        url: `${CONFIG.url}/rest/v1/profiles?select=username,display_name,avatar_species,bio&username=eq.benny`,
        json: [],
        ok: false,
      },
    ]);
    expect(await fetchProfile(CONFIG, fetcher, "benny")).toBeNull();
    expect(calls).toHaveLength(1);
  });
});

describe("fetchTeam", () => {
  it("queries by id and reads a public team", async () => {
    const id = "3f2c8a4e-1b2d-4c5a-9e8f-7a6b5c4d3e2f";
    const { fetcher, calls } = stubFetch([
      {
        url: `${CONFIG.url}/rest/v1/teams?select=id,name,is_public,data&id=eq.${id}`,
        json: [
          {
            id,
            name: "Sand Balance",
            is_public: true,
            data: [{ species: "Garchomp" }],
          },
        ],
      },
    ]);
    expect(await fetchTeam(CONFIG, fetcher, id)).toEqual({
      id,
      name: "Sand Balance",
      isPublic: true,
      species: ["Garchomp"],
    });
    expect(calls[0].headers.apikey).toBe("anon-key");
  });

  it("returns null for a private or unknown team", async () => {
    const id = "3f2c8a4e-1b2d-4c5a-9e8f-7a6b5c4d3e2f";
    const missing = stubFetch([]);
    expect(await fetchTeam(CONFIG, missing.fetcher, id)).toBeNull();
    const privateRow = stubFetch([
      {
        url: `${CONFIG.url}/rest/v1/teams?select=id,name,is_public,data&id=eq.${id}`,
        json: [{ id, name: "Private", is_public: false, data: [] }],
      },
    ]);
    expect(await fetchTeam(CONFIG, privateRow.fetcher, id)).toBeNull();
  });
});

describe("fetchPostData", () => {
  const postId = "9c8b7a6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d";
  const authorId = "1a2b3c4d-5e6f-4a3b-2c1d-0e9f8a7b6c5d";

  function script(entries: {
    post?: unknown[];
    author?: unknown[];
    group?: unknown[];
    image?: unknown[];
  }): StubResponse[] {
    return [
      {
        url: `${CONFIG.url}/rest/v1/posts?select=id,body,attachment,group_id,author_id&id=eq.${postId}`,
        json: entries.post ?? [],
      },
      {
        url: `${CONFIG.url}/rest/v1/profiles?select=username,display_name&id=eq.${authorId}`,
        json: entries.author ?? [],
      },
      {
        url: `${CONFIG.url}/rest/v1/groups?select=visibility&id=eq.group-uuid`,
        json: entries.group ?? [],
      },
      {
        url: `${CONFIG.url}/rest/v1/post_images?select=public_path,status&post_id=eq.${postId}&order=position.asc&limit=1`,
        json: entries.image ?? [],
      },
    ];
  }

  it("reads a main-feed post with an approved image", async () => {
    const { fetcher } = stubFetch(
      script({
        post: [
          {
            id: postId,
            body: "Hello",
            attachment: null,
            group_id: null,
            author_id: authorId,
          },
        ],
        author: [{ username: "benny", display_name: "Benny" }],
        image: [{ public_path: "uid/post/img.webp", status: "approved" }],
      }),
    );
    expect(await fetchPostData(CONFIG, fetcher, postId)).toEqual({
      id: postId,
      body: "Hello",
      authorName: "Benny",
      groupVisibility: null,
      teamSpecies: null,
      approvedImagePath: "uid/post/img.webp",
    });
  });

  it("returns null when the post is unreadable (removed, suspended author, invite-only)", async () => {
    const { fetcher, calls } = stubFetch(script({}));
    expect(await fetchPostData(CONFIG, fetcher, postId)).toBeNull();
    // No follow-up queries for a missing post.
    expect(calls).toHaveLength(1);
  });

  it("parses a team attachment", async () => {
    const { fetcher } = stubFetch(
      script({
        post: [
          {
            id: postId,
            body: "My team",
            attachment: {
              kind: "team",
              name: "Sand Balance",
              format: "doubles",
              members: [{ species: "Garchomp" }],
            },
            group_id: null,
            author_id: authorId,
          },
        ],
        author: [{ username: "benny", display_name: null }],
      }),
    );
    const post = await fetchPostData(CONFIG, fetcher, postId);
    expect(post?.teamSpecies).toEqual(["Garchomp"]);
    expect(post?.authorName).toBe("@benny");
  });

  it("marks a public group post as public", async () => {
    const { fetcher } = stubFetch(
      script({
        post: [
          {
            id: postId,
            body: "Hello",
            attachment: null,
            group_id: "group-uuid",
            author_id: authorId,
          },
        ],
        author: [{ username: "benny", display_name: "Benny" }],
        group: [{ visibility: "public" }],
      }),
    );
    expect(
      (await fetchPostData(CONFIG, fetcher, postId))?.groupVisibility,
    ).toBe("public");
  });

  it("fails closed when the group row is unreadable or malformed", async () => {
    const post = [
      {
        id: postId,
        body: "Hello",
        attachment: null,
        group_id: "group-uuid",
        author_id: authorId,
      },
    ];
    const missingGroup = stubFetch(
      script({ post, author: [{ username: "b" }] }),
    );
    expect(
      (await fetchPostData(CONFIG, missingGroup.fetcher, postId))
        ?.groupVisibility,
    ).toBe("unknown");
    const malformedGroup = stubFetch(
      script({ post, author: [{ username: "b" }], group: [{}] }),
    );
    expect(
      (await fetchPostData(CONFIG, malformedGroup.fetcher, postId))
        ?.groupVisibility,
    ).toBe("unknown");
  });

  it("ignores an image row that is not approved (defence in depth)", async () => {
    const { fetcher } = stubFetch(
      script({
        post: [
          {
            id: postId,
            body: "Hello",
            attachment: null,
            group_id: null,
            author_id: authorId,
          },
        ],
        author: [{ username: "benny", display_name: "Benny" }],
        image: [{ public_path: "p.webp", status: "pending" }],
      }),
    );
    expect(
      (await fetchPostData(CONFIG, fetcher, postId))?.approvedImagePath,
    ).toBeNull();
  });
});
