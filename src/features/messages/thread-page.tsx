import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeftIcon,
  FlagIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  SendIcon,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Page } from "@/components/page";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingArea, ThreadSkeleton } from "@/components/skeletons";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { useConversationMeta, useThread } from "@/lib/messages/queries";
import {
  useMarkConversationRead,
  useSendMessage,
  type ThreadMessage,
} from "@/lib/messages/mutations";
import {
  hasUnreadFromOther,
  MESSAGE_BODY_MAX,
  otherUserIdOf,
} from "@/lib/messages/logic";
import { useThreadRealtime } from "@/lib/messages/realtime";
import { ReportMessageDialog } from "@/features/messages/report-message-dialog";

/**
 * /messages/:id — one conversation. The composer sits above the phone tab
 * bar (sticky with the same inset `main` pads for), every message from the
 * other player carries a report button, and a rule failure (block, setting,
 * minor rule) shows a neutral notice that never says who blocked whom.
 */
export function ThreadPage({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const t = useT();
  const { id } = useParams();
  const conversationId = id ?? "";
  const { user } = useAuth();
  const metaQuery = useConversationMeta(conversationId, client);
  const threadQuery = useThread(conversationId, client);
  useThreadRealtime(conversationId, client);
  const sendMessage = useSendMessage(client);
  const markRead = useMarkConversationRead(client);

  const [body, setBody] = useState("");
  const [closed, setClosed] = useState(false);
  const [reporting, setReporting] = useState<ThreadMessage | null>(null);
  const markedRef = useRef<string | null>(null);

  const meta = metaQuery.data ?? null;
  // Stable identity for the effect below (threadQuery.data ?? [] would be a
  // new array on every render).
  const messages = useMemo(() => threadQuery.data ?? [], [threadQuery.data]);
  const otherUserId =
    meta && user ? otherUserIdOf(meta.conversation, user.id) : null;

  // Mark the conversation read whenever the other player's new messages
  // arrive (on load and live through Realtime).
  useEffect(() => {
    if (!meta || !user || !otherUserId || messages.length === 0) {
      return;
    }
    const newest = messages[messages.length - 1]!.created_at;
    if (
      markedRef.current === newest ||
      !hasUnreadFromOther(otherUserId, meta.lastReadAt, messages)
    ) {
      return;
    }
    markedRef.current = newest;
    void markRead.mutateAsync(conversationId);
  }, [meta, user, otherUserId, messages, markRead, conversationId]);

  const unavailable =
    closed ||
    (metaQuery.isSuccess && (meta === null || meta.closedAt !== null));

  const send = async () => {
    if (body.trim() === "" || body.trim().length > MESSAGE_BODY_MAX) {
      return;
    }
    const sent = body;
    // The optimistic copy appears in the thread at once, so the composer
    // clears immediately; a refused send keeps its row with a Retry action.
    setBody("");
    const result = await sendMessage.mutateAsync({
      conversationId,
      body: sent,
    });
    if (!result.ok) {
      if (result.error.code === "forbidden") {
        // A block, a setting or the minor rule: never say who or which.
        setClosed(true);
        toast.error(t("messages.threadUnavailable"));
      } else {
        toast.error(result.error.message);
      }
    }
  };

  const retry = (failedBody: string) => {
    void sendMessage.mutateAsync({ conversationId, body: failedBody });
  };

  const headerTitle = meta?.otherProfile
    ? (meta.otherProfile.display_name ?? meta.otherProfile.username)
    : t("messages.title");

  return (
    <Page title={headerTitle} width="narrow">
      <div className="mb-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/messages">
            <ArrowLeftIcon aria-hidden />
            {t("messages.title")}
          </Link>
        </Button>
      </div>

      {metaQuery.isPending || threadQuery.isPending ? (
        <LoadingArea
          pending={true}
          label={t("messages.loadingThreadAria")}
          skeleton={<ThreadSkeleton />}
        />
      ) : unavailable ? (
        <EmptyState title={t("messages.threadUnavailable")} />
      ) : (
        <>
          {meta?.otherProfile ? (
            <Link
              to={`/u/${meta.otherProfile.username}`}
              className="mb-3 flex items-center gap-2"
            >
              <UserAvatar
                username={meta.otherProfile.username}
                displayName={meta.otherProfile.display_name}
                avatarSpecies={meta.otherProfile.avatar_species}
                size="sm"
              />
              <span className="text-sm font-medium">
                {meta.otherProfile.display_name ?? meta.otherProfile.username}
              </span>
            </Link>
          ) : null}

          <ul className="grid gap-2 pb-2">
            {messages.map((message) => (
              <MessageRow
                key={message.id}
                message={message as ThreadMessage}
                fromMe={user !== null && message.sender_id === user.id}
                onReport={() => setReporting(message as ThreadMessage)}
                onRetry={retry}
              />
            ))}
          </ul>

          <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-4">
            <form
              className="flex items-center gap-2 rounded-md border bg-background/95 p-2 backdrop-blur"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <Input
                aria-label={t("messages.composerAria")}
                placeholder={t("messages.composerPlaceholder")}
                value={body}
                maxLength={MESSAGE_BODY_MAX + 1}
                onChange={(event) => setBody(event.target.value)}
                aria-invalid={
                  body.trim().length > MESSAGE_BODY_MAX || undefined
                }
                aria-describedby="thread-composer-hint"
                disabled={sendMessage.isPending}
              />
              <Button
                type="submit"
                size="icon"
                aria-label={t("messages.send")}
                disabled={
                  body.trim() === "" ||
                  body.trim().length > MESSAGE_BODY_MAX ||
                  sendMessage.isPending
                }
              >
                <SendIcon aria-hidden />
              </Button>
            </form>
            <p
              id="thread-composer-hint"
              className={cn(
                "mt-1 text-right text-xs",
                body.trim().length > MESSAGE_BODY_MAX
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {body.trim().length > MESSAGE_BODY_MAX
                ? t("messages.tooLong", { max: MESSAGE_BODY_MAX })
                : `${body.trim().length}/${MESSAGE_BODY_MAX}`}
            </p>
          </div>
        </>
      )}

      <ReportMessageDialog
        open={reporting !== null}
        onOpenChange={(open) => {
          if (!open) setReporting(null);
        }}
        messageId={reporting?.id ?? ""}
        client={client}
      />
    </Page>
  );
}

function MessageRow({
  message,
  fromMe,
  onReport,
  onRetry,
}: {
  message: ThreadMessage;
  fromMe: boolean;
  onReport: () => void;
  onRetry: (body: string) => void;
}) {
  const t = useT();
  const pending = message.pending === true;
  const failed = message.failed === true;
  return (
    <li
      className={cn(
        "flex max-w-[85%] flex-col gap-0.5",
        fromMe ? "ml-auto items-end" : "items-start",
        (pending || failed) && "opacity-70",
      )}
    >
      <div
        className={cn(
          "rounded-md px-3 py-1.5 text-sm break-words whitespace-pre-wrap",
          fromMe
            ? "bg-primary text-primary-foreground"
            : "border bg-card text-card-foreground",
        )}
      >
        {message.body}
      </div>
      <div className="flex items-center gap-2">
        {pending ? (
          <LoaderCircleIcon
            className="size-3 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : failed ? (
          <span className="text-[10px] text-destructive">
            {t("messages.notSent")}
          </span>
        ) : (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {new Date(message.created_at).toLocaleString()}
          </span>
        )}
        {failed ? (
          <button
            type="button"
            onClick={() => onRetry(message.body)}
            aria-label={t("common.retry")}
            className="text-muted-foreground transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:text-foreground"
          >
            <RotateCcwIcon className="size-3" aria-hidden />
          </button>
        ) : null}
        {!fromMe && !pending ? (
          <button
            type="button"
            onClick={onReport}
            aria-label={t("messages.reportButtonAria")}
            className="text-muted-foreground transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:text-foreground"
          >
            <FlagIcon className="size-3" aria-hidden />
          </button>
        ) : null}
      </div>
    </li>
  );
}
