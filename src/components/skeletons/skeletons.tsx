import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/*
 * Content-shaped skeletons. Each one mirrors the markup of the real content
 * it stands in for (same containers, sizes and spacing), so replacing the
 * skeleton with the content causes no layout shift. Everything renders on the
 * shared `Skeleton` block and the design tokens only.
 *
 * Every skeleton here is decorative: it sits inside a `LoadingArea` (or a
 * `role="status"` fallback) that carries the accessible loading label, so the
 * skeletons themselves are `aria-hidden`.
 */

const POST_CARD_COUNT = 3;

/** Generic stacked text lines, for compact list rows (link lists). */
export function TextLinesSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="grid gap-1.5" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={index === 0 ? "h-4 w-3/4" : "h-4 w-1/2"}
        />
      ))}
    </div>
  );
}

/** One avatar plus two text lines, for follower/member lists (`p-2` rows). */
function AvatarRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2" aria-hidden="true">
      <Skeleton className="size-7 shrink-0 rounded-full" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/** A list of avatar rows (`AvatarRowSkeleton`). */
export function AvatarListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-1">
      {Array.from({ length: count }, (_, index) => (
        <AvatarRowSkeleton key={index} />
      ))}
    </div>
  );
}

/** One feed post card, mirroring the `PostCard` layout. */
export function PostCardSkeleton() {
  return (
    <Card size="sm" aria-hidden="true">
      <div className="flex items-start gap-3 px-4 pt-4">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="ml-auto h-3 w-12" />
          </div>
          <div className="mt-2 grid gap-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 px-4 pb-1 pt-2">
        <Skeleton className="h-6 w-12 rounded-[min(var(--radius-md),10px)]" />
        <Skeleton className="h-6 w-12 rounded-[min(var(--radius-md),10px)]" />
        <Skeleton className="ml-auto size-6 rounded-[min(var(--radius-md),10px)]" />
      </div>
    </Card>
  );
}

/** The feed's list of post cards. */
export function PostListSkeleton({
  count = POST_CARD_COUNT,
}: {
  count?: number;
}) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }, (_, index) => (
        <PostCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** One comment row, mirroring the comment list items on a post's page. */
function CommentRowSkeleton() {
  return (
    <div className="rounded-md border bg-card p-3" aria-hidden="true">
      <div className="flex items-center gap-2">
        <Skeleton className="size-7 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="mt-2 h-4 w-2/3" />
    </div>
  );
}

/** A post's comment list. */
export function CommentListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: count }, (_, index) => (
        <CommentRowSkeleton key={index} />
      ))}
    </div>
  );
}

/** One group card, mirroring `GroupCard` on the groups page. */
function GroupCardSkeleton() {
  return (
    <div className="rounded-md border bg-card p-4" aria-hidden="true">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-2/3" />
    </div>
  );
}

/** The groups list. */
export function GroupListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }, (_, index) => (
        <GroupCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** One group member row, mirroring the members tab rows. */
function GroupMemberRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2" aria-hidden="true">
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="size-8 shrink-0 rounded-md" />
    </div>
  );
}

/** The group members list. */
export function GroupMemberListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }, (_, index) => (
        <GroupMemberRowSkeleton key={index} />
      ))}
    </div>
  );
}

/** A whole group page while the group itself loads: header then feed cards. */
export function GroupPageSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      <div className="rounded-md border bg-card p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
        <Skeleton className="mt-2 h-4 w-1/2" />
      </div>
      <PostListSkeleton count={2} />
    </div>
  );
}

/** The profile header card, mirroring `ProfileHeader`. */
function ProfileHeaderSkeleton() {
  return (
    <Card size="sm" aria-hidden="true">
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-start gap-4">
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

/** A whole profile page: header, section tabs, then the post list. */
export function ProfilePageSkeleton() {
  return (
    <div className="grid gap-6" aria-hidden="true">
      <ProfileHeaderSkeleton />
      <Skeleton className="h-8 w-64 rounded-full" />
      <PostListSkeleton />
    </div>
  );
}

/** One team card, mirroring the cards on the teams page. */
function TeamCardSkeleton({ slots = 6 }: { slots?: number }) {
  return (
    <Card size="sm" className="flex flex-col" aria-hidden="true">
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: slots }, (_, index) => (
            <Skeleton key={index} className="size-10 rounded-md" />
          ))}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="ml-auto h-7 w-20 rounded-md" />
      </CardFooter>
    </Card>
  );
}

/** The teams page grid. */
export function TeamGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <TeamCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** The team builder page: the six member cards in their responsive grid. */
export function TeamDetailSkeleton({ slots = 6 }: { slots?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: slots }, (_, index) => (
        <Skeleton key={index} className="min-h-40 rounded-lg" />
      ))}
    </div>
  );
}

/** One team member row inside the profile's team dialog. */
export function TeamMemberRowSkeleton() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <Skeleton className="size-10 shrink-0 rounded-md" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/** One notification row, mirroring `NotificationRowCard`. */
function NotificationRowSkeleton() {
  return (
    <div
      className="flex items-start gap-3 rounded-md border bg-card p-4"
      aria-hidden="true"
    >
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="size-8 shrink-0 rounded-md" />
    </div>
  );
}

/** The notifications list. */
export function NotificationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }, (_, index) => (
        <NotificationRowSkeleton key={index} />
      ))}
    </div>
  );
}

/** One conversation row, mirroring `ConversationRow` on the messages page. */
function ConversationRowSkeleton() {
  return (
    <div
      className="flex items-center gap-3 rounded-md border bg-card p-3"
      aria-hidden="true"
    >
      <Skeleton className="size-7 shrink-0 rounded-full" />
      <div className="grid min-w-0 flex-1 gap-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

/** The conversations list. */
export function ConversationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: count }, (_, index) => (
        <ConversationRowSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * One message thread: the partner header, alternating chat bubbles and the
 * composer bar, mirroring `ThreadPage`.
 */
export function ThreadSkeleton() {
  return (
    <div className="grid gap-2" aria-hidden="true">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="size-7 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-9 max-w-[85%] rounded-md" />
      <Skeleton className="ml-auto h-9 max-w-[85%] rounded-md" />
      <Skeleton className="h-9 max-w-[85%] rounded-md" />
      <Skeleton className="ml-auto h-9 max-w-[85%] rounded-md" />
      <div className="mt-3 flex items-center gap-2 rounded-md border bg-background/95 p-2">
        <Skeleton className="h-9 min-w-0 flex-1" />
        <Skeleton className="size-8 shrink-0 rounded-md" />
      </div>
    </div>
  );
}

/**
 * The metagame page: the battles/regulation line, the usage ranking heading
 * with its search field, and the usage table rows.
 */
export function MetagameSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-full rounded-md sm:w-48" />
        </div>
        <div className="rounded-lg border">
          {Array.from({ length: rows }, (_, index) => (
            <div
              key={index}
              className={
                index === 0
                  ? "flex items-center gap-3 px-3 py-2"
                  : "flex items-center gap-3 border-t px-3 py-2"
              }
            >
              <Skeleton className="h-4 w-8" />
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
