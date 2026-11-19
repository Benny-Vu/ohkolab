import { describe, expect, it } from "vitest";

import {
  assertPayloadIsSafe,
  assertionJwt,
  buildMessagePush,
  buildNotificationPush,
  type ClaimedNotification,
  parseServiceAccount,
  pemToDer,
  sendToTokens,
  settingColumnFor,
  shouldDropToken,
  type ServiceAccount,
} from "./push";

const ACCOUNT: ServiceAccount = {
  clientEmail: "push@ohkolab-501c9.iam.gserviceaccount.com",
  privateKey: "-----BEGIN PRIVATE KEY-----\nYWJj\n-----END PRIVATE KEY-----",
  projectId: "ohkolab-501c9",
};

function like(
  overrides: Partial<ClaimedNotification> = {},
): ClaimedNotification {
  return {
    id: "n-1",
    type: "like",
    actor_id: "actor-1",
    post_id: "post-1",
    group_id: null,
    created_at: "2026-11-21T10:00:00Z",
    ...overrides,
  };
}

describe("settingColumnFor", () => {
  it("maps every pushable type to its settings column", () => {
    expect(settingColumnFor("like")).toBe("likes");
    expect(settingColumnFor("comment")).toBe("comments");
    expect(settingColumnFor("follow")).toBe("follows");
    expect(settingColumnFor("group_invite")).toBe("groups");
  });

  it("never pushes moderation or appeal notifications", () => {
    expect(settingColumnFor("moderation")).toBeNull();
    expect(settingColumnFor("appeal")).toBeNull();
  });
});

describe("buildNotificationPush", () => {
  it("builds the push for a single like", () => {
    expect(buildNotificationPush([like()], "Ash", "post-1")).toEqual({
      title: "OHKOLab",
      body: "Ash liked your post",
      path: "/post/post-1",
    });
  });

  it("adds a tail when the claim batched several rows", () => {
    const batch = [
      like(),
      like({ id: "n-2", created_at: "2026-11-21T09:59:00Z" }),
      like({ id: "n-3", created_at: "2026-11-21T09:58:00Z" }),
    ];
    expect(buildNotificationPush(batch, "Ash", "post-1")?.body).toBe(
      "Ash liked your post (+2 more)",
    );
  });

  it("links follows to the actor's profile and invites to the group", () => {
    const follow = like({ type: "follow", post_id: null });
    expect(buildNotificationPush([follow], "Ash", "ashketchum")?.path).toBe(
      "/u/ashketchum",
    );
    const invite = like({
      type: "group_invite",
      post_id: null,
      group_id: "group-1",
    });
    expect(buildNotificationPush([invite], "Ash", "vgc-norge")?.path).toBe(
      "/g/vgc-norge",
    );
  });

  it("returns null for nothing to push", () => {
    expect(buildNotificationPush([], "Ash", "post-1")).toBeNull();
    expect(
      buildNotificationPush([like({ type: "moderation" })], "Ash", "post-1"),
    ).toBeNull();
  });
});

describe("buildMessagePush", () => {
  it("carries the sender's name and a plain sentence", () => {
    expect(buildMessagePush("Ash", "conv-1", 1)).toEqual({
      title: "OHKOLab",
      body: "Ash sent you a message",
      path: "/messages/conv-1",
    });
    expect(buildMessagePush("Ash", "conv-1", 3).body).toBe(
      "Ash sent you a message (+2 more)",
    );
  });

  it("never contains the message text, whatever it was", () => {
    const payload = buildMessagePush("Ash", "conv-1", 2);
    expect(() =>
      assertPayloadIsSafe(payload, [
        "here is my secret message text",
        "",
        "   ",
      ]),
    ).not.toThrow();
  });
});

describe("assertPayloadIsSafe", () => {
  it("throws the moment any forbidden text appears", () => {
    expect(() =>
      assertPayloadIsSafe(
        { title: "OHKOLab", body: "the plan is at midnight", path: "/x" },
        ["the plan is at midnight"],
      ),
    ).toThrow(/message text/);
  });
});

describe("parseServiceAccount", () => {
  it("parses the service-account JSON", () => {
    const raw = JSON.stringify({
      client_email: ACCOUNT.clientEmail,
      private_key: ACCOUNT.privateKey,
      project_id: ACCOUNT.projectId,
    });
    expect(parseServiceAccount(raw)).toEqual(ACCOUNT);
  });

  it("rejects keys with missing fields or bad JSON", () => {
    expect(() => parseServiceAccount("{}")).toThrow(/missing/);
    expect(() => parseServiceAccount("not json")).toThrow();
  });
});

describe("assertionJwt", () => {
  it("builds a one-hour FCM-scoped assertion", () => {
    const { header, claims } = assertionJwt(ACCOUNT, 1_000_000);
    expect(JSON.parse(header)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(claims).toEqual({
      iss: ACCOUNT.clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: 1_000_000,
      exp: 1_003_600,
    });
  });
});

describe("pemToDer", () => {
  it("decodes the PEM body to DER bytes", () => {
    expect(Array.from(pemToDer(ACCOUNT.privateKey))).toEqual([
      0x61, 0x62, 0x63,
    ]);
  });
});

describe("shouldDropToken", () => {
  it("drops unregistered tokens and keeps everything else", () => {
    expect(shouldDropToken(404, "UNREGISTERED")).toBe(true);
    expect(shouldDropToken(404, null)).toBe(true);
    expect(shouldDropToken(410, "UNREGISTERED")).toBe(true);
    expect(shouldDropToken(404, "SENDER_ID_MISMATCH")).toBe(false);
    expect(shouldDropToken(500, null)).toBe(false);
    expect(shouldDropToken(429, "QUOTA_EXCEEDED")).toBe(false);
  });
});

describe("sendToTokens", () => {
  const payload = {
    title: "OHKOLab",
    body: "Ash liked your post",
    path: "/post/post-1",
  };

  /** A fetch stand-in keyed by token. */
  function fakeFetch(
    handlers: Record<string, { status: number; body?: string }>,
  ): typeof fetch {
    return (async (url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        message: { token: string };
      };
      const handler = handlers[body.message.token];
      if (!handler) throw new Error("unexpected token");
      return new Response(handler.body ?? "{}", {
        status: handler.status,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;
  }

  it("sends, reports failures and flags dead tokens", async () => {
    const fetchImpl = fakeFetch({
      "good-token": { status: 200 },
      "dead-token": {
        status: 404,
        body: JSON.stringify({
          error: {
            details: [
              {
                "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError",
                errorCode: "UNREGISTERED",
              },
            ],
          },
        }),
      },
    });

    const results = await sendToTokens(
      ["good-token", "dead-token"],
      payload,
      ACCOUNT,
      "access-token",
      fetchImpl,
    );

    expect(results).toEqual([
      { token: "good-token", sent: true, dropToken: false },
      { token: "dead-token", sent: false, dropToken: true },
    ]);
  });

  it("keeps the token when the request fails outright", async () => {
    const failing = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const results = await sendToTokens(
      ["flaky-token"],
      payload,
      ACCOUNT,
      "access-token",
      failing,
    );

    expect(results).toEqual([
      { token: "flaky-token", sent: false, dropToken: false },
    ]);
  });
});
