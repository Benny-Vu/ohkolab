import { useMemo, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FeedPostRow, PostImageRow } from "@/lib/database.types";
import { useT } from "@/lib/i18n/t";
import { useRemoveGroupPost } from "@/lib/groups/mutations";
import { usePostImages } from "@/lib/social/images";
import { MODERATION_REASON_MAX } from "@/lib/social/validation";
import { PostCard } from "@/features/feed/post-card";

interface GroupPostListProps {
  posts: FeedPostRow[];
  /** True when the viewer owns or moderates the group. */
  canModerate: boolean;
}

/**
 * The group feed's post list: the shared PostCard plus, for group owners and
 * moderators, a "Remove from group" action in the post menu that asks for a
 * reason and calls the remove_group_post RPC. The posts' images are fetched
 * in one batched query (only with the VITE_IMAGE_POSTS flag on), like the
 * main feed's post list.
 */
export function GroupPostList({ posts, canModerate }: GroupPostListProps) {
  const t = useT();
  const removeGroupPost = useRemoveGroupPost();
  const [removingPostId, setRemovingPostId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const removing = removingPostId !== null;

  async function submitRemoval() {
    if (removingPostId === null) return;
    const trimmed = reason.trim();
    if (trimmed === "") {
      setError(t("postCard.enterReason"));
      return;
    }
    const result = await removeGroupPost.mutateAsync({
      postId: removingPostId,
      reason: trimmed,
    });
    if (result.ok) {
      toast.success(t("groups.removedToast"));
      setRemovingPostId(null);
      setReason("");
      setError(null);
    } else {
      setError(result.error.message);
    }
  }

  return (
    <>
      <ul className="grid gap-3">
        {posts.map((post) => (
          <li key={post.id}>
            <PostCard
              post={post}
              images={imagesByPost.get(post.id) ?? []}
              onRemoveFromGroup={
                canModerate
                  ? () => {
                      setRemovingPostId(post.id);
                      setReason("");
                      setError(null);
                    }
                  : undefined
              }
            />
          </li>
        ))}
      </ul>

      <Dialog
        open={removing}
        onOpenChange={(open) => {
          if (!open) {
            setRemovingPostId(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("groups.removeTitle")}</DialogTitle>
            <DialogDescription>
              {t("groups.removeDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="group-removal-reason">
              {t("groups.reasonLabel")}
            </Label>
            <Textarea
              id="group-removal-reason"
              value={reason}
              rows={3}
              maxLength={MODERATION_REASON_MAX}
              onChange={(event) => {
                setReason(event.target.value);
                setError(null);
              }}
              placeholder={t("groups.reasonPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {reason.trim().length}/{MODERATION_REASON_MAX}
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemovingPostId(null)}
              disabled={removeGroupPost.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={submitRemoval}
              disabled={removeGroupPost.isPending}
            >
              {removeGroupPost.isPending && (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              )}
              {t("postCard.removePost")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
