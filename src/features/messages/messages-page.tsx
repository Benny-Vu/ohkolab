import { Link } from "react-router";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Page } from "@/components/page";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConversationListSkeleton, LoadingArea } from "@/components/skeletons";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { formatDate } from "@/lib/format-date";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { useConversations } from "@/lib/messages/queries";
import type { ConversationSummary } from "@/lib/messages/logic";

/**
 * /messages: the conversation list. Other player's name and avatar, the
 * last message as a preview and an unread marker, newest activity first.
 * Phone first: rows stack, the preview truncates to one line.
 */
export function MessagesPage({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const t = useT();
  const { user } = useAuth();
  const conversationsQuery = useConversations(client);

  return (
    <Page
      title={t("pageTitle.messages")}
      description={t("messages.description")}
      width="narrow"
    >
      {!user ? (
        <EmptyState title={t("messages.signIn")} />
      ) : conversationsQuery.isError ? (
        <ErrorState
          title={t("messages.loadError")}
          description={t("messages.loadError")}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void conversationsQuery.refetch()}
            >
              {t("common.retry")}
            </Button>
          }
        />
      ) : (
        <LoadingArea
          pending={conversationsQuery.isPending}
          label={t("messages.loadingConversationsAria")}
          skeleton={<ConversationListSkeleton />}
        >
          {(conversationsQuery.data ?? []).length === 0 ? (
            <EmptyState title={t("messages.empty")} />
          ) : (
            <ul className="grid gap-2">
              {(conversationsQuery.data ?? []).map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                />
              ))}
            </ul>
          )}
        </LoadingArea>
      )}
    </Page>
  );
}

function ConversationRow({
  conversation,
}: {
  conversation: ConversationSummary;
}) {
  const t = useT();
  return (
    <li>
      <Link
        to={`/messages/${conversation.id}`}
        className="flex items-center gap-3 rounded-md border bg-card p-3 transition-colors duration-150 ease-out hover:border-primary/60 focus-visible:outline-2"
      >
        <UserAvatar
          username={conversation.otherUsername}
          displayName={conversation.otherDisplayName}
          avatarSpecies={conversation.otherAvatarSpecies}
          size="sm"
        />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium">
              {conversation.otherDisplayName ?? conversation.otherUsername}
            </span>
            {conversation.unread > 0 ? (
              <Badge>
                {conversation.unread > 99 ? "99+" : conversation.unread}
                <span className="sr-only">{t("notifications.unreadSr")}</span>
              </Badge>
            ) : null}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {conversation.lastMessage
              ? conversation.lastMessage.deleted
                ? t("messages.previewDeleted")
                : (conversation.lastMessage.fromMe
                    ? `${t("messages.you")}: `
                    : "") + conversation.lastMessage.body
              : ""}
          </span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatDate(conversation.lastActivityAt)}
        </span>
      </Link>
    </li>
  );
}
