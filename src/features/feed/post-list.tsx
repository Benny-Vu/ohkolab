import { useMemo } from "react";

import type { FeedPostRow, PostImageRow } from "@/lib/database.types";
import { EmptyState } from "@/components/empty-state";
import { usePostImages } from "@/lib/social/images";
import { ROW_ENTRANCE, staggerDelay } from "@/lib/motion/entrance";
import { PostCard } from "@/features/feed/post-card";

interface PostListProps {
  posts: FeedPostRow[];
  emptyMessage?: string;
  /** Optional call to action rendered inside the empty state. */
  emptyAction?: React.ReactNode;
}

/**
 * Presentational list of posts. The parent owns fetching (feed queries on the
 * home page, author posts on profiles). The list's images are fetched in one
 * batched query per page (only with the VITE_IMAGE_POSTS flag on) and handed
 * to each card, so no card queries on its own.
 */
export function PostList({ posts, emptyMessage, emptyAction }: PostListProps) {
  const postIds = useMemo(() => posts.map((post) => post.id), [posts]);
  const imagesQuery = usePostImages(postIds);
  const imagesByPost = useMemo(() => {
    const map = new Map<string, PostImageRow[]>();
    for (const row of imagesQuery.data ?? []) {
      const list = map.get(row.post_id);
      if (list) {
        list.push(row);
      } else {
        map.set(row.post_id, [row]);
      }
    }
    return map;
  }, [imagesQuery.data]);

  if (posts.length === 0) {
    return (
      <EmptyState title={emptyMessage ?? "No posts yet"} action={emptyAction} />
    );
  }
  return (
    <ul className="grid gap-3">
      {posts.map((post, index) => (
        // Rows stagger in when their post arrives (first load or a new
        // page); a plain re-render never replays the entrance, since the
        // row is keyed by its post and a CSS animation plays once, on
        // mount. See src/lib/motion/entrance.ts.
        <li
          key={post.id}
          className={ROW_ENTRANCE}
          style={{ animationDelay: `${staggerDelay(index)}ms` }}
        >
          <PostCard
            post={post}
            images={imagesByPost.get(post.id) ?? []}
            imagesLoadError={imagesQuery.isError}
            onRetryImages={() => void imagesQuery.refetch()}
          />
        </li>
      ))}
    </ul>
  );
}
