/**
 * The notifications page: the signed-in user's notifications with actor
 * avatars, sentences, relative times and links, grouped by post
 * ("Ana and 4 others liked your post"), in Today / This week / Earlier
 * sections, with follow-back buttons on follow notifications, unread
 * highlighting, mark read / mark all read and delete actions, and every
 * loading, empty, error and signed-out state.
 */

import { lazy, Suspense } from "react";
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
import { isPushAvailable } from "@/lib/push/flag";
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
import {
  describeGroupedNotification,
  groupNotifications,
  rowCreatedAt,
  type NotificationRow,
} from "@/lib/notifications/grouping";
import {
  NOTIFICATION_SECTION_LABEL_KEYS,
  sectionNotifications,
} from "@/lib/notifications/sections";
import type { NotificationItem } from "@/lib/notifications/types";
import { FollowBackButton } from "@/features/notifications/follow-back-button";
import { cn } from "@/lib/utils";

// The "Turn on notifications" card only exists in the native app while
// VITE_PUSH is on; it loads lazily so flag-off builds never download it.
const PushPermissionCard = lazy(() =>
  import("@/features/notifications/push-permission-card").then((m) => ({
    default: m.PushPermissionCard,
  })),
);

/**
 * The row unmounts when its notification is deleted, taking focus with it;
 * park focus on the page landmark so keyboard users keep their place.
 */
function focusMainLandmark(): void {
  (document.querySelector("main") as HTMLElement | null)?.focus();
}

/** The React key for one row: a single notification or a merged group. */
function rowKey(row: NotificationRow): string {
  return row.kind === "single"
    ? row.item.id
    : `group:${row.items[0]?.id ?? row.postId}`;
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

  async function handleMarkRead(ids: string[]): Promise<void> {
    // A merged row marks every notification behind it, but the reader
    // only hears about it once.
    const results = await Promise.all(
      ids.map((id) => markRead.mutateAsync(id)),
    );
    const failure = results.find((result) => !result.ok);
    if (failure && !failure.ok) {
      toast.error(failure.error.message);
    } else {
      toast.success(t("notifications.markedRead"));
    }
  }

  async function handleMarkAllRead(): Promise<void> {
    const result = await markAllRead.mutateAsync();
    if (result.ok) {
      toast.success(t("notifications.allMarkedRead"));
    } else {
      toast.error(result.error.message);
    }
  }

  async function handleDelete(ids: string[]): Promise<void> {
    const results = await Promise.all(
      ids.map((id) => deleteNotification.mutateAsync(id)),
    );
    const failure = results.find((result) => !result.ok);
    if (failure && !failure.ok) {
      toast.error(failure.error.message);
    } else {
      focusMainLandmark();
      toast.success(t("notifications.deletedToast"));
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
            aria-label={t("notifications.markAllAsRead")}
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
      ) : (
        <>
          {/* Push opt-in: native app only, behind VITE_PUSH. This is the
              one place that asks for the OS permission — never on its own. */}
          {isPushAvailable() ? (
            <div className="mb-3">
              <Suspense fallback={null}>
                <PushPermissionCard />
              </Suspense>
            </div>
          ) : null}
          {notifications.isError ? (
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
                onMarkRead={(ids) => void handleMarkRead(ids)}
                onDelete={(ids) => void handleDelete(ids)}
                markPending={markRead.isPending}
                deletePending={deleteNotification.isPending}
                hasNextPage={notifications.hasNextPage}
                isFetchingNextPage={notifications.isFetchingNextPage}
                onLoadMore={() => void notifications.fetchNextPage()}
              />
            </LoadingArea>
          )}
        </>
      )}
    </Page>
  );
}

interface NotificationsListProps {
  items: NotificationItem[];
  onMarkRead: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
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

  const rows = groupNotifications(items);
  const sections = sectionNotifications(rows, new Date());
  const allRead = items.every((item) => item.readAt !== null);

  return (
    <div className="grid gap-5">
      {sections.map((section) => (
        <section key={section.name} className="grid gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t(NOTIFICATION_SECTION_LABEL_KEYS[section.name])}
          </h2>
          <div className="grid gap-3">
            {section.rows.map((row, index) => (
              // Rows stagger in when their notification arrives (first load
              // or "Load more"); a re-render (marking one read) never replays
              // the entrance — see src/lib/motion/entrance.ts.
              <div
                key={rowKey(row)}
                className={ROW_ENTRANCE}
                style={{ animationDelay: `${staggerDelay(index)}ms` }}
              >
                <NotificationRowCard
                  row={row}
                  onMarkRead={onMarkRead}
                  onDelete={onDelete}
                  markPending={markPending}
                  deletePending={deletePending}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
      {allRead && (
        <p className="py-1 text-center text-sm text-muted-foreground">
          {t("notifications.allCaughtUp")}
        </p>
      )}
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
  row: NotificationRow;
  onMarkRead: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
  markPending: boolean;
  deletePending: boolean;
}

function NotificationRowCard({
  row,
  onMarkRead,
  onDelete,
  markPending,
  deletePending,
}: NotificationRowCardProps) {
  const t = useT();
  const lead =
    row.kind === "single"
      ? row.item
      : (row.items[0] ?? row.items[row.items.length - 1]);
  const sentence =
    row.kind === "group"
      ? describeGroupedNotification(row)
      : describeNotification(row.item);
  const ids =
    row.kind === "single" ? [row.item.id] : row.items.map((item) => item.id);
  const isUnread =
    row.kind === "single"
      ? row.item.readAt === null
      : row.items.some((item) => item.readAt === null);
  const isGroup = row.kind === "group";
  const actor = actorLabel(lead?.actor ?? null);
  const profilePath = actorProfilePath(lead?.actor ?? null);
  const canFollowBack =
    row.kind === "single" &&
    row.item.type === "follow" &&
    row.item.actor !== null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border bg-card p-4",
        isUnread && "border-accent-brand-text/40 bg-muted",
      )}
    >
      {lead?.actor ? (
        <UserAvatar
          username={lead.actor.username}
          displayName={lead.actor.displayName}
          avatarSpecies={lead.actor.avatarSpecies}
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
          {formatRelativeTime(rowCreatedAt(row))}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canFollowBack && row.kind === "single" && row.item.actor ? (
          <FollowBackButton actor={row.item.actor} />
        ) : null}
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
            aria-label={t(
              isGroup
                ? "notifications.markGroupRead"
                : "notifications.markRead",
              { name: actor },
            )}
            onClick={() => onMarkRead(ids)}
            disabled={markPending}
          >
            <CheckIcon aria-hidden />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t(
            isGroup ? "notifications.deleteGroup" : "notifications.delete",
            { name: actor },
          )}
          onClick={() => onDelete(ids)}
          disabled={deletePending}
        >
          <Trash2Icon aria-hidden />
        </Button>
      </div>
    </div>
  );
}
