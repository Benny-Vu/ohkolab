import type { FeedPostRow } from "@/lib/database.types";
import { EmptyState } from "@/components/empty-state";
import { PostCard } from "@/features/feed/post-card";

interface PostListProps {
  posts: FeedPostRow[];
  emptyMessage?: string;
  /** Optional call to action rendered inside the empty state. */
  emptyAction?: React.ReactNode;
}

/**
 * Presentational list of posts. The parent owns fetching (feed queries on the
 * home page, author posts on profiles).
 */
export function PostList({ posts, emptyMessage, emptyAction }: PostListProps) {
  if (posts.length === 0) {
    return (
      <EmptyState title={emptyMessage ?? "No posts yet"} action={emptyAction} />
    );
  }
  return (
    <ul className="grid gap-3">
      {posts.map((post) => (
        <li key={post.id}>
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  );
}
