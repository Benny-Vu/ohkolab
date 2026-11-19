/**
 * The notifications page: the signed-in user's notifications with actor
 * avatars, sentences, relative times and links, unread highlighting, mark
 * read / mark all read and delete actions, and every loading, empty, error
 * and signed-out state.
 */

import { Link } from "react-router";
import { toast } from "sonner";
import { CheckIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingArea, NotificationListSkeleton } from "@/components/skeletons";
import { Page } from "@/components/page";
import { UserAvatar } from "@/components/user-avatar";
import { ROW_ENTRANCE, staggerDelay } from "@/lib/motion/entrance";
import { useAuth } from "@/lib/auth/use-auth";
import { formatRelativeTime } from "@/features/feed/relative-time";
import { useT } from "@/lib/i18n/t";
import {
  useNotifications,
  useUnreadNotificationCount,
} from "@/lib/notifications/queries";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/lib/notifications/mutations";
import {
  actorLabel,
  actorProfilePath,
  describeNotification,
} from "@/lib/notifications/sentences";
import type { NotificationItem } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

/**
 * The row unmounts when its notification is deleted, taking focus with it;
 * park focus on the page landmark so keyboard users keep their place.
 */
function focusMainLandmark(): void {
  (document.querySelector("main") as HTMLElement | null)?.focus();
}

export function NotificationsPage() {
  const { user } = useAuth();
  const t = useT();
  const notifications = useNotifications();
  const unread = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const unreadCount = unread.data ?? 0;

  async function handleMarkRead(id: string) {
    const result = await markRead.mutateAsync(id);
    if (result.ok) {
      toast.success(t("notifications.markedRead"));
    } else {
      toast.error(result.error.message);
    }
  }

  async function handleMarkAllRead() {
    const result = await markAllRead.mutateAsync();
    if (result.ok) {
      toast.success(t("notifications.allMarkedRead"));
    } else {
      toast.error(result.error.message);
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteNotification.mutateAsync(id);
    if (result.ok) {
      focusMainLandmark();
      toast.success(t("notifications.deletedToast"));
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Page
      title={t("notifications.title")}
      description={t("notifications.description")}
      width="narrow"
      actions={
        user && unreadCount > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleMarkAllRead()}
            disabled={markAllRead.isPending}
          >
            <CheckIcon aria-hidden />
            {t("notifications.markAllAsRead")}
          </Button>
        ) : undefined
      }
    >
      {!user ? (
        <EmptyState
          title={t("notifications.signedOutTitle")}
          description={t("notifications.signedOutDescription")}
          action={
            <Button asChild size="sm">
              <Link to="/login?returnTo=/notifications">
                {t("common.signIn")}
              </Link>
            </Button>
          }
        />
      ) : notifications.isError ? (
        <ErrorState
          title={t("notifications.errorTitle")}
          description={notifications.error.message}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void notifications.refetch()}
            >
              {t("common.retry")}
            </Button>
          }
        />
      ) : (
        <LoadingArea
          pending={notifications.isPending}
          label={t("notifications.loadingAria")}
          skeleton={<NotificationListSkeleton />}
        >
          <NotificationsList
            items={notifications.data?.pages.flat() ?? []}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
            markPending={markRead.isPending}
            deletePending={deleteNotification.isPending}
            hasNextPage={notifications.hasNextPage}
            isFetchingNextPage={notifications.isFetchingNextPage}
            onLoadMore={() => void notifications.fetchNextPage()}
          />
        </LoadingArea>
      )}
    </Page>
  );
}

interface NotificationsListProps {
  items: NotificationItem[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  /** A mark-read or delete is in flight: the row buttons wait for it. */
  markPending: boolean;
  deletePending: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

function NotificationsList({
  items,
  onMarkRead,
  onDelete,
  markPending,
  deletePending,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: NotificationsListProps) {
  const t = useT();
  if (items.length === 0) {
    return (
      <EmptyState
        title={t("notifications.emptyTitle")}
        description={t("notifications.emptyDescription")}
      />
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        // Rows stagger in when their notification arrives (first load or
        // "Load more"); a re-render (marking one read) never replays the
        // entrance — see src/lib/motion/entrance.ts.
        <div
          key={item.id}
          className={ROW_ENTRANCE}
          style={{ animationDelay: `${staggerDelay(index)}ms` }}
        >
          <NotificationRowCard
            item={item}
            onMarkRead={onMarkRead}
            onDelete={onDelete}
            markPending={markPending}
            deletePending={deletePending}
          />
        </div>
      ))}
      {hasNextPage && (
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage
            ? t("common.loading")
            : t("notifications.loadMore")}
        </Button>
      )}
    </div>
  );
}

interface NotificationRowCardProps {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  markPending: boolean;
  deletePending: boolean;
}

function NotificationRowCard({
  item,
  onMarkRead,
  onDelete,
  markPending,
  deletePending,
}: NotificationRowCardProps) {
  const t = useT();
  const sentence = describeNotification(item);
  const profilePath = actorProfilePath(item.actor);
  const isUnread = item.readAt === null;
  const actor = actorLabel(item.actor);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border bg-card p-4",
        isUnread && "border-accent-brand-text/40 bg-muted",
      )}
    >
      {item.actor ? (
        <UserAvatar
          username={item.actor.username}
          displayName={item.actor.displayName}
          avatarSpecies={item.actor.avatarSpecies}
          size="md"
          className="mt-0.5"
        />
      ) : (
        <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
          {actor.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {isUnread && (
          <span className="sr-only">{t("notifications.unreadSr")}</span>
        )}
        <p className="break-words text-sm">
          {profilePath ? (
            <Link
              to={profilePath}
              className="font-medium text-foreground hover:underline"
            >
              {actor}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{actor}</span>
          )}{" "}
          {sentence.to ? (
            <Link
              to={sentence.to}
              className="text-muted-foreground hover:underline"
            >
              {sentence.text}
            </Link>
          ) : (
            <span className="text-muted-foreground">{sentence.text}</span>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatRelativeTime(item.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {isUnread && (
          <span
            aria-hidden
            className="mt-0.5 size-2 shrink-0 rounded-full bg-accent-brand-text"
          />
        )}
        {isUnread && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("notifications.markRead", { name: actor })}
            onClick={() => onMarkRead(item.id)}
            disabled={markPending}
          >
            <CheckIcon aria-hidden />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("notifications.delete", { name: actor })}
          onClick={() => onDelete(item.id)}
          disabled={deletePending}
        >
          <Trash2Icon aria-hidden />
        </Button>
      </div>
    </div>
  );
}
