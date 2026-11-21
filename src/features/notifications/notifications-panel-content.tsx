/**
 * The notifications content shared by the page (/notifications, kept for
 * deep links and pushes) and the bell's popover: the grouped list with
 * actor avatars, sentences and relative times, follow-back buttons, unread
 * highlighting, mark read / mark all read and delete actions, the native
 * push opt-in card, and the loading, empty and error states.
 */

import { lazy, Suspense, useMemo } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { CheckIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  adjacentIconHitSmClass,
  buttonSmTouchClass,
  buttonTouchClass,
  linkHitClass,
} from "@/components/touch-targets";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingArea, NotificationListSkeleton } from "@/components/skeletons";
import { UserAvatar } from "@/components/user-avatar";
import { ROW_ENTRANCE, staggerDelay } from "@/lib/motion/entrance";
import { isPushAvailable } from "@/lib/push/flag";
import { formatRelativeTime } from "@/lib/relative-time";
import { useT } from "@/lib/i18n/t";
import {
  useNotifications,
  useUnreadNotificationCount,
} from "@/lib/notifications/queries";
import { useFollowStates } from "@/lib/social/queries";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/lib/notifications/mutations";
import {
  actorLabel,
  actorProfilePath,
  describeNotification,
  type NotificationSentence,
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

/**
 * The signed-in notifications content: data, actions and the grouped list.
 * The page frames it; the bell shows it in its panel.
 */
export function NotificationsPanelContent({
  showHeader = false,
}: {
  /**
   * The bell panel frames the list with a header (the title and "Mark all
   * read"); the page carries both in its own chrome.
   */
  showHeader?: boolean;
}) {
  const t = useT();
  const notifications = useNotifications();
  const unread = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const unreadCount = unread.data ?? 0;

  // One batched query for every follow-back row, instead of one
  // follow-state request per row.
  const followActorIds = useMemo(() => {
    const ids = (notifications.data?.pages.flat() ?? [])
      .filter((item) => item.type === "follow" && item.actor)
      .map((item) => item.actor!.id);
    return [...new Set(ids)];
  }, [notifications.data]);
  const followStates = useFollowStates(followActorIds);

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
    <>
      {showHeader ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-medium">
            {t("notifications.title")}
          </span>
          {unreadCount > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className={buttonSmTouchClass}
              aria-label={t("notifications.markAllAsRead")}
              onClick={() => void handleMarkAllRead()}
              loading={markAllRead.isPending}
              disabled={markAllRead.isPending}
            >
              <CheckIcon aria-hidden />
              {t("notifications.markAllAsRead")}
            </Button>
          ) : null}
        </div>
      ) : null}
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
              className={buttonSmTouchClass}
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
            followStates={followStates.data}
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
  );
}

/** The signed-out panel: one sentence and a sign-in link. */
export function NotificationsSignedOut() {
  const t = useT();
  return (
    <EmptyState
      title={t("notifications.signedOutTitle")}
      description={t("notifications.signedOutDescription")}
      action={
        <Button asChild size="sm" className={buttonSmTouchClass}>
          <Link to="/login?returnTo=/notifications">{t("common.signIn")}</Link>
        </Button>
      }
    />
  );
}

interface NotificationsListProps {
  items: NotificationItem[];
  /** The batched follow states of every follow row's actor (one query). */
  followStates: Map<string, boolean> | undefined;
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
  followStates,
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
    <div className="grid gap-4">
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
                  followStates={followStates}
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
          className={buttonTouchClass}
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
  /** The batched follow states of every follow row's actor (one query). */
  followStates: Map<string, boolean> | undefined;
  onMarkRead: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
  markPending: boolean;
  deletePending: boolean;
}

function NotificationRowCard({
  row,
  followStates,
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
  // A battle notification carries no post, group or request content to the
  // row, so it gets one neutral line per actor and links to the board. It
  // can say "offered" or "accepted" only by leaking request state, which
  // never shows here.
  const battleSentence: NotificationSentence | null =
    lead?.type === "battle"
      ? { text: t("battles.notificationLine"), to: "/battles" }
      : null;
  const shownSentence = battleSentence ?? sentence;
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
              className={`font-medium text-foreground hover:underline ${linkHitClass}`}
            >
              {actor}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{actor}</span>
          )}{" "}
          {shownSentence.to ? (
            <Link
              to={shownSentence.to}
              className={`text-muted-foreground hover:underline ${linkHitClass}`}
            >
              {shownSentence.text}
            </Link>
          ) : (
            <span className="text-muted-foreground">{shownSentence.text}</span>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatRelativeTime(rowCreatedAt(row))}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canFollowBack && row.kind === "single" && row.item.actor ? (
          <FollowBackButton
            actor={row.item.actor}
            following={followStates?.get(row.item.actor.id) === true}
          />
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
            className={adjacentIconHitSmClass}
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
          className={adjacentIconHitSmClass}
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
