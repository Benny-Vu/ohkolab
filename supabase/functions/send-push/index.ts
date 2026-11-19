/**
 * send-push (Deno Edge Function): turns new notifications and direct
 * messages into FCM pushes.
 *
 * The caller is the database, never a client: the triggers from
 * 20261120210000_push_notifications.sql POST {table, id} through pg_net
 * with the x-webhook-key header that must match the PUSH_WEBHOOK_KEY
 * secret. Deploy with JWT verification OFF (no user token is involved) —
 * the shared key is the gate, so nobody but the database can invoke it.
 *
 * Flow, best-effort end to end (a push must never break an insert):
 *   1. claim_push_batch / claim_push_messages claims every unpushed row
 *      for the recipient — a burst of likes becomes one push, and rows
 *      arriving inside the one-minute cooldown ride with the next claim;
 *   2. push_settings decides whether the kind pushes at all (a missing
 *      row means everything on);
 *   3. every push_token of the recipient gets the message through FCM
 *      HTTP v1 (FCM_SERVICE_ACCOUNT holds the service-account key), and
 *      tokens FCM reports unregistered are deleted.
 *
 * The privacy rule runs before every send: a push carries names and event
 * kinds only — for messages, "<sender> sent you a message" and never the
 * message text (assertPayloadIsSafe throws rather than leak it).
 */
import {
  assertPayloadIsSafe,
  buildMessagePush,
  buildNotificationPush,
  getAccessToken,
  parseServiceAccount,
  sendToTokens,
  settingColumnFor,
  type ClaimedMessage,
  type ClaimedNotification,
  type PushPayload,
  type ServiceAccount,
} from "../_shared/push.ts";
import { serviceClient } from "../_shared/supabase.ts";

const db = serviceClient();

/** The FCM access token, cached for most of its one-hour life. */
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function fcmAccessToken(account: ServiceAccount): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }
  const token = await getAccessToken(account);
  cachedAccessToken = { token, expiresAt: Date.now() + 50 * 60_000 };
  return token;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** The actor's push name and profile username, or "Someone". */
async function actorProfile(
  userId: string | null,
): Promise<{ name: string; username: string | null }> {
  if (!userId) return { name: "Someone", username: null };
  const { data } = await db
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return { name: "Someone", username: null };
  return { name: data.display_name ?? data.username, username: data.username };
}

/** True when the recipient's settings allow the kind (missing row = on). */
async function pushesAllowed(
  recipientId: string,
  settingsColumn: string | null,
): Promise<boolean> {
  if (!settingsColumn) return false;
  const { data } = await db
    .from("push_settings")
    .select()
    .eq("user_id", recipientId)
    .maybeSingle();
  if (!data) return true;
  return data.enabled !== false && data[settingsColumn] !== false;
}

/** Sends one payload to every token of one user; drops FCM's dead ones. */
async function pushToUser(
  recipientId: string,
  payload: PushPayload,
  forbiddenText: string[],
): Promise<void> {
  assertPayloadIsSafe(payload, forbiddenText);
  const { data: tokens, error } = await db
    .from("push_tokens")
    .select("token")
    .eq("user_id", recipientId);
  if (error) throw new Error(`token read failed: ${error.message}`);
  const tokenList = (tokens ?? []).map((row) => row.token);
  if (tokenList.length === 0) return;

  const account = parseServiceAccount(
    Deno.env.get("FCM_SERVICE_ACCOUNT") ?? "",
  );
  const accessToken = await fcmAccessToken(account);
  const results = await sendToTokens(tokenList, payload, account, accessToken);
  const deadTokens = results
    .filter((result) => result.dropToken)
    .map((result) => result.token);
  if (deadTokens.length > 0) {
    const { error: deleteError } = await db
      .from("push_tokens")
      .in("token", deadTokens)
      .delete();
    if (deleteError) {
      throw new Error(`dead-token cleanup failed: ${deleteError.message}`);
    }
  }
}

/** One webhook row from the notifications table. */
async function handleNotification(id: string): Promise<void> {
  const { data: notification } = await db
    .from("notifications")
    .select("recipient_id")
    .eq("id", id)
    .maybeSingle();
  if (!notification) return;
  const recipient = notification.recipient_id;

  const { data: claimedRows, error } = await db.rpc("claim_push_batch", {
    p_recipient: recipient,
  });
  if (error) throw new Error(`claim_push_batch failed: ${error.message}`);
  const claimed = (claimedRows ?? []) as ClaimedNotification[];
  if (claimed.length === 0) return;

  const newest = claimed[0];
  if (!(await pushesAllowed(recipient, settingColumnFor(newest.type)))) return;

  const actor = await actorProfile(newest.actor_id);
  const linkTarget =
    newest.type === "follow"
      ? (actor.username ?? "")
      : newest.type === "group_invite" && newest.group_id
        ? await groupSlug(newest.group_id)
        : (newest.post_id ?? "");
  const payload = buildNotificationPush(claimed, actor.name, linkTarget);
  if (!payload) return;
  await pushToUser(recipient, payload, []);
}

/** One webhook row from the messages table (never its text). */
async function handleMessage(id: string): Promise<void> {
  const { data: message } = await db
    .from("messages")
    .select("conversation_id, sender_id, body")
    .eq("id", id)
    .maybeSingle();
  if (!message) return;

  const { data: participants } = await db
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", message.conversation_id);
  const recipients = (participants ?? [])
    .map((row) => row.user_id)
    .filter((userId) => userId !== message.sender_id);

  for (const recipient of recipients) {
    const { data: claimedRows, error } = await db.rpc("claim_push_messages", {
      p_recipient: recipient,
    });
    if (error) throw new Error(`claim_push_messages failed: ${error.message}`);
    const claimed = (claimedRows ?? []) as ClaimedMessage[];
    if (claimed.length === 0) continue;
    if (!(await pushesAllowed(recipient, "messages"))) continue;

    const sender = await actorProfile(message.sender_id);
    const payload = buildMessagePush(
      sender.name,
      message.conversation_id,
      claimed.length,
    );
    // The triggering message's body: the payload must not contain it.
    await pushToUser(recipient, payload, [message.body]);
  }
}

async function groupSlug(groupId: string): Promise<string> {
  const { data } = await db
    .from("groups")
    .select("slug")
    .eq("id", groupId)
    .maybeSingle();
  return data?.slug ?? "groups";
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  const webhookKey = Deno.env.get("PUSH_WEBHOOK_KEY") ?? "";
  const serviceAccount = Deno.env.get("FCM_SERVICE_ACCOUNT") ?? "";
  if (!webhookKey || !serviceAccount) {
    // Nothing is configured yet (the flag-off world): say so loudly.
    return json({ ok: false, error: "push is not configured" }, 503);
  }
  if (req.headers.get("x-webhook-key") !== webhookKey) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  const body = (await req.json().catch(() => null)) as {
    table?: string;
    id?: string;
  } | null;
  if (!body?.table || !body.id) {
    return json({ ok: false, error: "bad request" }, 400);
  }
  if (body.table !== "notifications" && body.table !== "messages") {
    return json({ ok: false, error: "unknown table" }, 400);
  }
  try {
    if (body.table === "notifications") await handleNotification(body.id);
    else await handleMessage(body.id);
    return json({ ok: true }, 200);
  } catch (error) {
    // pg_net ignores responses; the function logs are the only trace.
    console.error("send-push failed:", error);
    return json({ ok: false }, 200);
  }
});
