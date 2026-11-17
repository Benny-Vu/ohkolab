/**
 * The notifications page: the signed-in user's notifications with actor
 * avatars, sentences, relative times and links, unread highlighting, mark
 * read / mark all read and delete actions, and every loading, empty, error
 * and signed-out state.
 */

import { Link } from "react-router";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  BellIcon,
  CheckIcon,
  LogInIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Page } from "@/components/page";
import { PokemonIcon } from "@/components/pokemon-sprite";
import { useAuth } from "@/lib/auth/use-auth";
import { formatRelativeTime } from "@/features/feed/relative-time";
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

export function NotificationsPage() {
  const { user } = useAuth();
  const notifications = useNotifications();
  const unread = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const unreadCount = unread.data ?? 0;

  async function handleMarkRead(id: string) {
    const result = await markRead.mutateAsync(id);
    if (result.ok) {
      toast.success("Notification marked as read");
    } else {
      toast.error(result.error.message);
    }
  }

  async function handleMarkAllRead() {
    const result = await markAllRead.mutateAsync();
    if (result.ok) {
      toast.success("All notifications marked as read");
    } else {
      toast.error(result.error.message);
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteNotification.mutateAsync(id);
    if (result.ok) {
      toast.success("Notification deleted");
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Page
      title="Notifications"
      description="Likes, comments, follows and moderation updates."
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
            Mark all as read
          </Button>
        ) : undefined
      }
    >
      {!user ? (
        <Card size="sm" className="border-dashed p-6 text-center">
          <LogInIcon
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to see your notifications.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link to="/login?returnTo=/notifications">Sign in</Link>
          </Button>
        </Card>
      ) : notifications.isPending ? (
        <div className="grid gap-3" aria-label="Loading notifications">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : notifications.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden />
          <AlertTitle>Could not load notifications</AlertTitle>
          <AlertDescription>{notifications.error.message}</AlertDescription>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void notifications.refetch()}
          >
            Try again
          </Button>
        </Alert>
      ) : (
        <NotificationsList
          items={notifications.data?.pages.flat() ?? []}
          onMarkRead={handleMarkRead}
          onDelete={handleDelete}
          hasNextPage={notifications.hasNextPage}
          isFetchingNextPage={notifications.isFetchingNextPage}
          onLoadMore={() => void notifications.fetchNextPage()}
        />
      )}
    </Page>
  );
}

interface NotificationsListProps {
  items: NotificationItem[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

function NotificationsList({
  items,
  onMarkRead,
  onDelete,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: NotificationsListProps) {
  if (items.length === 0) {
    return (
      <Card size="sm" className="border-dashed p-6 text-center">
        <BellIcon
          className="mx-auto size-6 text-muted-foreground"
          aria-hidden
        />
        <p className="mt-2 text-sm text-muted-foreground">
          No notifications yet. When someone likes your post or follows you, it
          shows up here.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <NotificationRowCard
          key={item.id}
          item={item}
          onMarkRead={onMarkRead}
          onDelete={onDelete}
        />
      ))}
      {hasNextPage && (
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}

interface NotificationRowCardProps {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationRowCard({
  item,
  onMarkRead,
  onDelete,
}: NotificationRowCardProps) {
  const sentence = describeNotification(item);
  const profilePath = actorProfilePath(item.actor);
  const isUnread = item.readAt === null;

  return (
    <Card
      size="sm"
      className={cn(
        "flex items-start gap-3 p-4",
        isUnread && "border-primary bg-muted",
      )}
    >
      {item.actor ? (
        <PokemonIcon
          species={item.actor.avatarSpecies ?? "Missingno"}
          className="mt-0.5 size-10 shrink-0"
        />
      ) : (
        <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <UserIcon className="size-5" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          {profilePath ? (
            <Link
              to={profilePath}
              className="font-medium text-foreground hover:underline"
            >
              {actorLabel(item.actor)}
            </Link>
          ) : (
            <span className="font-medium text-foreground">
              {actorLabel(item.actor)}
            </span>
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
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Mark ${actorLabel(item.actor)}'s notification as read`}
            onClick={() => onMarkRead(item.id)}
          >
            <CheckIcon aria-hidden />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete notification from ${actorLabel(item.actor)}`}
          onClick={() => onDelete(item.id)}
        >
          <Trash2Icon aria-hidden />
        </Button>
      </div>
    </Card>
  );
}
