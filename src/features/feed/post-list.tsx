import type { FeedPostRow } from "@/lib/database.types";
import { PostCard } from "@/features/feed/post-card";

interface PostListProps {
  posts: FeedPostRow[];
  emptyMessage?: string;
}

/**
 * Presentational list of posts. The parent owns fetching (feed queries on the
 * home page, author posts on profiles).
 */
export function PostList({ posts, emptyMessage }: PostListProps) {
  if (posts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "No posts yet."}
      </p>
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
