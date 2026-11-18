import { useState } from "react";
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
import type { FeedPostRow } from "@/lib/database.types";
import { useRemoveGroupPost } from "@/lib/groups/mutations";
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
 * reason and calls the remove_group_post RPC.
 */
export function GroupPostList({ posts, canModerate }: GroupPostListProps) {
  const removeGroupPost = useRemoveGroupPost();
  const [removingPostId, setRemovingPostId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const removing = removingPostId !== null;

  async function submitRemoval() {
    if (removingPostId === null) return;
    const trimmed = reason.trim();
    if (trimmed === "") {
      setError("Enter a reason for the removal.");
      return;
    }
    const result = await removeGroupPost.mutateAsync({
      postId: removingPostId,
      reason: trimmed,
    });
    if (result.ok) {
      toast.success("Post removed from the group");
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
            <DialogTitle>Remove post from group</DialogTitle>
            <DialogDescription>
              The post is hidden from the group, the reason is recorded and the
              author is notified.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="group-removal-reason">Reason</Label>
            <Textarea
              id="group-removal-reason"
              value={reason}
              rows={3}
              maxLength={MODERATION_REASON_MAX}
              onChange={(event) => {
                setReason(event.target.value);
                setError(null);
              }}
              placeholder="Why is this post being removed?"
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
              Cancel
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
              Remove post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
