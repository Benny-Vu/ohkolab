/**
 * Shared skeleton loaders: `LoadingArea` (the labelled, anti-flash loading
 * branch that cross-fades into the content) plus one content-shaped skeleton
 * per surface, mirroring the real markup so nothing shifts on arrival.
 */
export {
  CONTENT_FADE_IN,
  LoadingArea,
} from "@/components/skeletons/loading-area";
export { PageSkeleton } from "@/components/skeletons/page-skeleton";
export {
  AvatarListSkeleton,
  AvatarRowSkeleton,
  CommentListSkeleton,
  CommentRowSkeleton,
  ConversationListSkeleton,
  ConversationRowSkeleton,
  GroupCardSkeleton,
  GroupListSkeleton,
  GroupMemberListSkeleton,
  GroupMemberRowSkeleton,
  GroupPageSkeleton,
  MetagameSkeleton,
  NotificationListSkeleton,
  NotificationRowSkeleton,
  PostCardSkeleton,
  PostListSkeleton,
  ProfileHeaderSkeleton,
  ProfilePageSkeleton,
  TeamCardSkeleton,
  TeamDetailSkeleton,
  TeamGridSkeleton,
  TeamMemberRowSkeleton,
  TextLinesSkeleton,
  ThreadSkeleton,
} from "@/components/skeletons/skeletons";
export {
  SKELETON_DELAY_MS,
  useDelayedPending,
} from "@/components/skeletons/use-delayed-pending";
