import { useState } from "react";
import { useNavigate } from "react-router";
import {
  BanIcon,
  CopyIcon,
  ExternalLinkIcon,
  FlagIcon,
  HeartIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  ShieldOffIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { PokemonIcon } from "@/components/pokemon-sprite";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth/use-auth";
import { useTeams } from "@/lib/team";
import {
  useDeletePost,
  useToggleBlock,
  useToggleLike,
  useUpdatePost,
} from "@/lib/social/mutations";
import { useRemoveContent } from "@/lib/social/moderation";
import { useIsModerator } from "@/lib/social/queries";
import { POST_BODY_MAX } from "@/lib/social/validation";
import type { FeedPostRow } from "@/lib/database.types";
import { formatRelativeTime } from "@/features/feed/relative-time";
import { parseTeamAttachment } from "@/features/feed/attachment";
import { ReportDialog } from "@/features/feed/report-dialog";

interface PostCardProps {
  post: FeedPostRow;
  /** Hide the comment count link on the post detail page. */
  hideCommentLink?: boolean;
  /** Moderator action: take the post out of its group. */
  onRemoveFromGroup?: () => void;
}

/**
 * One post in the feed: author line, body, optional team attachment and the
 * like / comment / overflow actions.
 */
export function PostCard({
  post,
  hideCommentLink = false,
  onRemoveFromGroup,
}: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toggleLike = useToggleLike(post.id);
  const toggleBlock = useToggleBlock(post.author_id);
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const removeContent = useRemoveContent();
  const moderatorQuery = useIsModerator();
  const isModerator = moderatorQuery.data === true;
  const { create } = useTeams();

  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeReason, setRemoveReason] = useState("");

  const isOwn = user?.id === post.author_id;
  const attachment = parseTeamAttachment(post.attachment);
  const liked = post.liked_by_me === true;
  const displayName = post.author_display_name ?? post.author_username;
  const showHandle =
    displayName.trim().toLowerCase() !==
    post.author_username.trim().toLowerCase();

  async function handleLike() {
    const result = await toggleLike.mutateAsync();
    if (!result.ok) toast.error(result.error.message);
  }

  async function handleCopyTeam() {
    if (!attachment) return;
    const team = create({
      name: attachment.name,
      format: attachment.format,
      members: attachment.members,
    });
    toast.success(`Copied "${team.name}" to your teams.`);
  }

  function handleOpenInCalc() {
    if (!attachment) return;
    navigate("/calc", { state: { attacker: attachment.members[0] } });
  }

  async function handleUpdate() {
    const trimmed = editBody.trim();
    if (trimmed === "" || editBody.length > POST_BODY_MAX) return;
    const result = await updatePost.mutateAsync({
      postId: post.id,
      body: editBody,
    });
    if (result.ok) {
      setEditing(false);
      toast.success("Post updated.");
    } else {
      toast.error(result.error.message);
    }
  }

  async function handleDelete() {
    const result = await deletePost.mutateAsync(post.id);
    if (result.ok) {
      setConfirmDelete(false);
      toast.success("Post deleted.");
    } else {
      toast.error(result.error.message);
    }
  }

  async function handleBlock() {
    const result = await toggleBlock.mutateAsync();
    if (result.ok) {
      setBlocking(false);
      toast.success(`Blocked @${post.author_username}.`);
    } else {
      toast.error(result.error.message);
    }
  }

  async function handleRemove() {
    const reason = removeReason.trim();
    if (reason === "") {
      toast.error("Enter a reason for the removal.");
      return;
    }
    const result = await removeContent.mutateAsync({
      type: "post",
      id: post.id,
      reason,
    });
    if (result.ok) {
      setRemoving(false);
      setRemoveReason("");
      toast.success("Post removed.");
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Card size="sm">
      <div className="flex items-start gap-3 px-4 pt-4">
        <UserAvatar
          username={post.author_username}
          displayName={post.author_display_name}
          avatarSpecies={post.author_avatar_species}
          size="md"
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={`/u/${post.author_username}`}
              className="truncate font-medium hover:underline"
            >
              {displayName}
            </a>
            {showHandle && (
              <span className="truncate text-sm text-muted-foreground">
                @{post.author_username}
              </span>
            )}
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(post.created_at)}
            </span>
          </div>

          {editing ? (
            <div className="mt-2 grid gap-2">
              <Textarea
                aria-label="Edit post"
                value={editBody}
                onChange={(event) => setEditBody(event.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  disabled={updatePost.isPending}
                >
                  {updatePost.isPending && (
                    <LoaderCircleIcon className="animate-spin" aria-hidden />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(false)}
                  disabled={updatePost.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap break-words">{post.body}</p>
          )}

          {attachment && (
            <div className="mt-3 rounded-md border bg-surface-sunken p-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{attachment.name}</p>
                <span className="text-xs text-muted-foreground capitalize">
                  {attachment.format}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {attachment.members.map((member, index) => (
                  <PokemonIcon
                    key={`${member.species}-${index}`}
                    species={member.species}
                    className="size-8"
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="xs" variant="outline" onClick={handleCopyTeam}>
                  <CopyIcon aria-hidden />
                  Copy to my teams
                </Button>
                <Button size="xs" variant="outline" onClick={handleOpenInCalc}>
                  <ExternalLinkIcon aria-hidden />
                  Open in calc
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 px-4 pb-1 pt-2">
        <Button
          size="xs"
          variant="ghost"
          onClick={handleLike}
          disabled={toggleLike.isPending}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          className="text-muted-foreground tabular-nums"
        >
          <HeartIcon
            className={liked ? "fill-current text-primary" : undefined}
            aria-hidden
          />
          {post.like_count}
        </Button>
        {!hideCommentLink && (
          <Button
            size="xs"
            variant="ghost"
            aria-label={`${post.comment_count} ${post.comment_count === 1 ? "comment" : "comments"}`}
            onClick={() => navigate(`/post/${post.id}`)}
            className="text-muted-foreground tabular-nums"
          >
            <MessageCircleIcon aria-hidden />
            {post.comment_count}
          </Button>
        )}
        <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Post options"
                  className="ml-auto"
                >
                  <MoreHorizontalIcon aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwn ? (
                  <>
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditBody(post.body);
                        setEditing(true);
                      }}
                    >
                      <PencilIcon aria-hidden />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setConfirmDelete(true)}
                    >
                      <Trash2Icon aria-hidden />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onSelect={() => setReporting(true)}>
                      <FlagIcon aria-hidden />
                      Report post
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setBlocking(true)}>
                      <BanIcon aria-hidden />
                      Block @{post.author_username}
                    </DropdownMenuItem>
                  </>
                )}
                {onRemoveFromGroup && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onRemoveFromGroup()}
                    >
                      <ShieldOffIcon aria-hidden />
                      Remove from group
                    </DropdownMenuItem>
                  </>
                )}
                {isModerator && !isOwn && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setRemoving(true)}
                    >
                      <Trash2Icon aria-hidden />
                      Remove post
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ReportDialog
        open={reporting}
        onOpenChange={setReporting}
        targetType="post"
        targetId={post.id}
      />

      <Dialog open={removing} onOpenChange={setRemoving}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove this post?</DialogTitle>
            <DialogDescription>
              The post is removed for everyone and the author is notified with
              your reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Reason for the removal"
            placeholder="Reason for the removal"
            value={removeReason}
            onChange={(event) => setRemoveReason(event.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoving(false)}
              disabled={removeContent.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removeContent.isPending || removeReason.trim() === ""}
            >
              {removeContent.isPending && (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              )}
              Remove post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
            <DialogDescription>
              This cannot be undone. The post and its comments will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deletePost.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePost.isPending}
            >
              {deletePost.isPending && (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blocking} onOpenChange={setBlocking}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Block @{post.author_username}?</DialogTitle>
            <DialogDescription>
              You will no longer see their posts in your Following feed. You can
              unblock them from your account page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBlocking(false)}
              disabled={toggleBlock.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlock}
              disabled={toggleBlock.isPending}
            >
              {toggleBlock.isPending && (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              )}
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
