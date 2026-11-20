/**
 * Shared skeleton loaders: `LoadingArea` (the labelled, anti-flash loading
 * branch that cross-fades into the content) plus one content-shaped skeleton
 * per surface, mirroring the real markup so nothing shifts on arrival.
 */
export {
  CONTENT_FADE_IN,
  LoadingArea,
} from "@/components/skeletons/loading-area";
export {
  AvatarListSkeleton,
  CommentListSkeleton,
  ConversationListSkeleton,
  GroupListSkeleton,
  GroupMemberListSkeleton,
  GroupPageSkeleton,
  MetagameSkeleton,
  NotificationListSkeleton,
  PostCardSkeleton,
  PostListSkeleton,
  ProfilePageSkeleton,
  TeamDetailSkeleton,
  TeamGridSkeleton,
  TeamMemberRowSkeleton,
  TextLinesSkeleton,
  ThreadSkeleton,
} from "@/components/skeletons/skeletons";
export { SKELETON_DELAY_MS } from "@/components/skeletons/use-delayed-pending";
