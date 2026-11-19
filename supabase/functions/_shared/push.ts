/**
 * Push delivery helpers for the send-push Edge Function.
 *
 * Everything here is pure or Web-API-only (fetch, crypto.subtle), with no
 * Deno imports, so the unit tests run under the repo's Vitest exactly like
 * the modules in src/lib. The one privacy rule this file enforces above all:
 * a push carries NAMES and KINDS of events, never message text.
 */

/** One row from claim_push_batch, newest first. */
export interface ClaimedNotification {
  id: string;
  type: string;
  actor_id: string | null;
  post_id: string | null;
  group_id: string | null;
  created_at: string;
}

/** One row from claim_push_messages, newest first. Never a body. */
export interface ClaimedMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  created_at: string;
}

/** The payload that becomes one FCM notification plus its tap target. */
export interface PushPayload {
  title: string;
  body: string;
  /** In-app path the push opens when tapped. */
  path: string;
}

/** The pushable notification kinds and their push_settings column. */
const SETTING_COLUMN: Record<string, string> = {
  like: "likes",
  comment: "comments",
  follow: "follows",
  group_invite: "groups",
};

/** The push_settings column a notification type honours, or null to skip. */
export function settingColumnFor(type: string): string | null {
  return SETTING_COLUMN[type] ?? null;
}

/** The push text for one notification type, or null when it never pushes. */
function eventSentence(
  type: string,
  actorName: string,
): { text: string; path: string } | null {
  switch (type) {
    case "like":
      return { text: `${actorName} liked your post`, path: "post" };
    case "comment":
      return { text: `${actorName} commented on your post`, path: "post" };
    case "follow":
      return { text: `${actorName} followed you`, path: "profile" };
    case "group_invite":
      return { text: `${actorName} invited you to a group`, path: "group" };
    default:
      return null;
  }
}

/**
 * The push for a claimed batch: the newest event's sentence plus a
 * "(+N more)" tail, and the newest event's tap target. `actorName` and
 * `linkTarget` resolve the newest claimed row (a username for follows, a
 * group slug for invites, a post id for likes and comments).
 */
export function buildNotificationPush(
  claimed: ClaimedNotification[],
  actorName: string,
  linkTarget: string,
): PushPayload | null {
  const newest = claimed[0];
  if (!newest) return null;
  const event = eventSentence(newest.type, actorName);
  if (!event) return null;
  const path =
    event.path === "post"
      ? `/post/${linkTarget}`
      : event.path === "profile"
        ? `/u/${linkTarget}`
        : `/g/${linkTarget}`;
  const tail = claimed.length > 1 ? ` (+${claimed.length - 1} more)` : "";
  return { title: "OHKOLab", body: `${event.text}${tail}`, path };
}

/**
 * The push for a claimed message batch: the sender's name and a plain
 * "sent you a message" — never the message text (test-enforced below).
 */
export function buildMessagePush(
  senderName: string,
  conversationId: string,
  count: number,
): PushPayload {
  const tail = count > 1 ? ` (+${count - 1} more)` : "";
  return {
    title: "OHKOLab",
    body: `${senderName} sent you a message${tail}`,
    path: `/messages/${conversationId}`,
  };
}

/**
 * Throws when a serialized push payload contains any of the forbidden
 * strings. send-push calls this before every send with the message body
 * it handled, so a future refactor cannot leak text into pushes.
 */
export function assertPayloadIsSafe(
  payload: PushPayload,
  forbidden: string[],
): void {
  const serialized = JSON.stringify(payload);
  for (const text of forbidden) {
    const trimmed = text.trim();
    if (trimmed && serialized.includes(trimmed)) {
      throw new Error("push payload contained message text; refusing to send");
    }
  }
}

// ---------------------------------------------------------------------------
// FCM HTTP v1. Access tokens come from a service-account JWT assertion
// signed with the account's RS256 key; messages go one per token so a bad
// token can be dropped precisely.
// ---------------------------------------------------------------------------

/** The parsed FCM_SERVICE_ACCOUNT secret (a service-account JSON key). */
export interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
  projectId: string;
}

/** Parses and validates the service-account JSON. Throws on gaps. */
export function parseServiceAccount(raw: string): ServiceAccount {
  const json = JSON.parse(raw) as Record<string, unknown>;
  const clientEmail =
    typeof json.client_email === "string" ? json.client_email : "";
  const privateKey =
    typeof json.private_key === "string" ? json.private_key : "";
  const projectId = typeof json.project_id === "string" ? json.project_id : "";
  if (!clientEmail || !privateKey || !projectId) {
    throw new Error(
      "service account is missing client_email, private_key or project_id",
    );
  }
  return { clientEmail, privateKey, projectId };
}

/** The unsigned JWT pieces for the OAuth2 assertion (pure, test-covered). */
export function assertionJwt(
  account: ServiceAccount,
  nowSeconds: number,
): { header: string; claims: Record<string, string | number> } {
  const claims = {
    iss: account.clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };
  return {
    header: JSON.stringify({ alg: "RS256", typ: "JWT" }),
    claims,
  };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Exchanges the signed JWT for an OAuth2 access token. */
/** The DER bytes of a PEM-encoded PKCS#8 private key. */
export function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Exchanges the signed JWT for an OAuth2 access token. */
export async function getAccessToken(
  account: ServiceAccount,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const { header, claims } = assertionJwt(account, now);
  const headerB64 = base64UrlEncode(new TextEncoder().encode(header));
  const claimsB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(claims)),
  );
  const unsigned = `${headerB64}.${claimsB64}`;

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "pkcs8",
      pemToDer(account.privateKey),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
  } catch {
    throw new Error("could not import the service-account private key");
  }
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;

  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`token exchange failed: ${response.status}`);
  }
  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("token exchange returned no access token");
  }
  return json.access_token;
}

/** One FCM v1 send outcome for a single token. */
export interface TokenSendResult {
  token: string;
  sent: boolean;
  /** True when FCM reported the token dead and the row must go. */
  dropToken: boolean;
}

/** Reads FCM's error payload and decides whether the token is dead. */
export function shouldDropToken(
  status: number,
  errorCode: string | null,
): boolean {
  if (status === 404 || status === 410) {
    return errorCode === null || errorCode === "UNREGISTERED";
  }
  return false;
}

/**
 * Sends one message to every token. Tokens FCM reports unregistered are
 * flagged so the caller deletes their rows; other failures (quota,
 * server) keep the token for the next push.
 */
export async function sendToTokens(
  tokens: string[],
  payload: PushPayload,
  account: ServiceAccount,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 10_000,
): Promise<TokenSendResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const results = await Promise.all(
      tokens.map(async (token): Promise<TokenSendResult> => {
        const url = `https://fcm.googleapis.com/v1/projects/${account.projectId}/messages:send`;
        try {
          const response = await fetchImpl(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: payload.title, body: payload.body },
                data: { path: payload.path },
              },
            }),
            signal: controller.signal,
          });
          if (response.ok) return { token, sent: true, dropToken: false };
          const error = (await response.json().catch(() => null)) as {
            error?: { details?: Array<{ errorCode?: string }> };
          } | null;
          const errorCode = error?.error?.details?.[0]?.errorCode ?? null;
          return {
            token,
            sent: false,
            dropToken: shouldDropToken(response.status, errorCode),
          };
        } catch {
          // Network failure or timeout: keep the token, retry next push.
          return { token, sent: false, dropToken: false };
        }
      }),
    );
    return results;
  } finally {
    clearTimeout(timer);
  }
}
