import { useState } from "react";
import { useNavigate } from "react-router";
import {
  BanIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FlagIcon,
  HeartIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Share2Icon,
  ShieldOffIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/error-state";
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
import {
  menuItemClass,
  menuItemDestructiveClass,
} from "@/components/menu-item-class";
import { Textarea } from "@/components/ui/textarea";
import { TeamPreview } from "@/components/team-preview/team-preview";
import { TeamIdChip } from "@/components/team-id-chip";
import { UserAvatar } from "@/components/user-avatar";
import { DamageMeter } from "@/components/damage-meter";
import { KoLabel } from "@/components/ko-label";
import { useDisplayName } from "@/data";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";
import { displayTeamName } from "@/lib/team/display";
import { useTeams } from "@/lib/team";
import {
  useDeletePost,
  useToggleBlock,
  useToggleLike,
  useUpdatePost,
} from "@/lib/social/mutations";
import { useRemoveContent } from "@/lib/social/moderation";
import { useIsModerator } from "@/lib/social/queries";
import { usePostImages, visiblePostImages } from "@/lib/social/images";
import { POST_BODY_MAX } from "@/lib/social/validation";
import type { FeedPostRow, PostImageRow } from "@/lib/database.types";
import { formatRelativeTime } from "@/features/feed/relative-time";
import { PostImageGrid } from "@/features/feed/post-images";
import {
  parseCalcResultAttachment,
  parseTeamAttachment,
} from "@/features/feed/attachment";
import { koResultOf } from "@/features/calc/ko-result";
import { ReportDialog } from "@/features/feed/report-dialog";
import { SaveImageDialog } from "@/features/share/save-image";
import { useShare } from "@/features/share/share-link";
import type { ShareCardContent } from "@/lib/share-cards/svg";

/**
 * The card unmounts when its post is deleted or removed, taking focus with it;
 * park focus on the page landmark so keyboard users keep their place.
 */
function focusMainLandmark(): void {
  (document.querySelector("main") as HTMLElement | null)?.focus();
}

interface PostCardProps {
  post: FeedPostRow;
  /** Hide the comment count link on the post detail page. */
  hideCommentLink?: boolean;
  /** Moderator action: take the post out of its group. */
  onRemoveFromGroup?: () => void;
  /**
   * The post's image rows, when the parent already fetched them (the feed
   * batches one query per page). When omitted the card fetches its own —
   * only while the VITE_IMAGE_POSTS flag is on.
   */
  images?: PostImageRow[];
  /**
   * True when the parent's batched image query failed, so the rows are
   * unknown rather than empty. Shown in the images area as a retryable
   * error; the rest of the post stays as it is.
   */
  imagesLoadError?: boolean;
  /** Retries the parent's batched image query ("Try again" in the error). */
  onRetryImages?: () => void;
}

/**
 * One post in the feed: author line, body, optional team attachment, its
 * images (flagged builds) and the like / comment / overflow actions.
 */
export function PostCard({
  post,
  hideCommentLink = false,
  onRemoveFromGroup,
  images,
  imagesLoadError,
  onRetryImages,
}: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  // The calc-result attachment stores English roster names; show the
  // localized ones, falling back to the stored string.
  const nameOf = useDisplayName();
  const toggleLike = useToggleLike(post.id);
  const toggleBlock = useToggleBlock(post.author_id);
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const removeContent = useRemoveContent();
  const moderatorQuery = useIsModerator();
  const isModerator = moderatorQuery.data === true;
  const { create } = useTeams();

  const [editing, setEditing] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeReason, setRemoveReason] = useState("");
  // Counts like activations so the heart can play its one-shot pop.
  const [likePop, setLikePop] = useState(0);
  const share = useShare();

  const isOwn = user?.id === post.author_id;
  const ownImagesQuery = usePostImages(images === undefined ? [post.id] : []);
  const imageItems = visiblePostImages(
    images ?? ownImagesQuery.data ?? [],
    isOwn,
  );
  // A failed images batch (the card's own query or the parent's) leaves the
  // rows unknown; the images area says so with a retry, the post stays.
  const imagesFailed =
    images !== undefined ? imagesLoadError === true : ownImagesQuery.isError;
  const retryImages =
    images !== undefined && onRetryImages
      ? onRetryImages
      : () => void ownImagesQuery.refetch();
  const team = parseTeamAttachment(post.attachment);
  const calcResult = parseCalcResultAttachment(post.attachment);
  const liked = post.liked_by_me === true;
  const displayName = post.author_display_name ?? post.author_username;
  const showHandle =
    displayName.trim().toLowerCase() !==
    post.author_username.trim().toLowerCase();
  // The share card quotes the post: the author as the heading, the body as
  // the secondary line, the attached team's species as the sprite row.
  const cardContent: ShareCardContent = {
    kind: "post",
    eyebrow: null,
    heading: displayName,
    body: post.body,
    stat: null,
    species: team ? team.members.map((member) => member.species) : [],
  };

  async function handleLike() {
    setLikePop((count) => count + 1);
    const result = await toggleLike.mutateAsync();
    if (!result.ok) toast.error(result.error.message);
  }

  async function handleCopyTeam() {
    if (!team) return;
    const created = create({
      name: team.name,
      format: team.format,
      members: team.members,
      gameTeamId: team.gameTeamId,
    });
    toast.success(
      t("postCard.copiedTeam", { name: displayTeamName(created.name) }),
    );
  }

  function handleOpenInCalc() {
    if (!team) return;
    navigate("/calc", { state: { attacker: team.members[0] } });
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
      toast.success(t("postCard.updatedToast"));
    } else {
      toast.error(result.error.message);
    }
  }

  async function handleDelete() {
    const result = await deletePost.mutateAsync(post.id);
    if (result.ok) {
      setConfirmDelete(false);
      focusMainLandmark();
      toast.success(t("postCard.deletedToast"));
    } else {
      toast.error(result.error.message);
    }
  }

  async function handleBlock() {
    const result = await toggleBlock.mutateAsync();
    if (result.ok) {
      setBlocking(false);
      toast.success(t("postCard.blockedToast", { name: post.author_username }));
    } else {
      toast.error(result.error.message);
    }
  }

  async function handleRemove() {
    const reason = removeReason.trim();
    if (reason === "") {
      toast.error(t("postCard.enterReason"));
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
      focusMainLandmark();
      toast.success(t("postCard.removedToast"));
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Card
      size="sm"
      className="transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:border-accent-brand-text/40 hover:bg-accent-brand-subtle"
    >
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
                aria-label={t("postCard.editAria")}
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
                  {t("common.save")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(false)}
                  disabled={updatePost.isPending}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap break-words">{post.body}</p>
          )}

          {team && (
            <div className="mt-3 rounded-md border bg-surface-sunken p-3">
              <div className="flex items-center gap-2">
                <p className="min-w-0 truncate text-sm font-medium">
                  {displayTeamName(team.name)}
                </p>
                <span className="shrink-0 text-xs text-muted-foreground capitalize">
                  {team.format}
                </span>
                {team.gameTeamId ? (
                  <TeamIdChip
                    id={team.gameTeamId}
                    compact
                    className="ml-auto"
                  />
                ) : null}
              </div>
              {team.members.length > 0 ? (
                <div className="mt-2">
                  <TeamPreview
                    team={team}
                    variant="compact"
                    ariaLabel={displayTeamName(team.name)}
                  />
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="xs" variant="outline" onClick={handleCopyTeam}>
                  <CopyIcon aria-hidden />
                  {t("postCard.copyTeam")}
                </Button>
                <Button size="xs" variant="outline" onClick={handleOpenInCalc}>
                  <ExternalLinkIcon aria-hidden />
                  {t("postCard.openInCalc")}
                </Button>
              </div>
            </div>
          )}

          {calcResult && (
            <div className="mt-3 rounded-md border bg-surface-sunken p-3">
              <div className="flex items-center gap-2">
                <p className="min-w-0 truncate text-sm font-medium">
                  {t("postCard.vs", {
                    a: nameOf("species", calcResult.attacker),
                    b: nameOf("species", calcResult.defender),
                  })}
                </p>
                {(() => {
                  const ko = koResultOf(calcResult.koText);
                  return ko ? (
                    <KoLabel className="ml-auto shrink-0" result={ko} />
                  ) : (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {calcResult.koText}
                    </span>
                  );
                })()}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-medium">
                  {nameOf("move", calcResult.move)}
                </span>
                <span className="font-heading text-lg font-semibold tabular-nums">
                  {calcResult.minPercent === calcResult.maxPercent
                    ? `${calcResult.maxPercent}%`
                    : `${calcResult.minPercent} - ${calcResult.maxPercent}%`}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {t("postCard.damageRange", {
                    min: calcResult.min,
                    max: calcResult.max,
                  })}
                </span>
              </div>
              <DamageMeter
                className="mt-2"
                minPercent={calcResult.minPercent}
                maxPercent={calcResult.maxPercent}
                hpPercent={100}
                size="sm"
              />
            </div>
          )}

          {imageItems.length > 0 && (
            <PostImageGrid images={imageItems} className="mt-3" />
          )}

          {imagesFailed && (
            <ErrorState
              title={t("social.images.loadError")}
              action={
                <Button
                  size="xs"
                  variant="outline"
                  onClick={retryImages}
                  disabled={ownImagesQuery.isRefetching}
                >
                  {t("common.retry")}
                </Button>
              }
              className="mt-3 px-4 py-4"
            />
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
          aria-label={liked ? t("postCard.unlike") : t("postCard.like")}
          className="text-muted-foreground tabular-nums"
        >
          <HeartIcon
            key={likePop}
            className={cn(
              liked ? "fill-current text-primary" : undefined,
              likePop > 0 &&
                "animate-in zoom-in-125 duration-(--motion-fast) ease-(--motion-ease-out)",
            )}
            aria-hidden
          />
          {post.like_count}
        </Button>
        {!hideCommentLink && (
          <Button
            size="xs"
            variant="ghost"
            aria-label={t(
              post.comment_count === 1
                ? "postCard.commentAriaOne"
                : "postCard.commentAriaMany",
              { n: post.comment_count },
            )}
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
              aria-label={t("postCard.options")}
              className="ml-auto"
            >
              <MoreHorizontalIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className={menuItemClass}
              onSelect={() =>
                void share({
                  title: displayName,
                  text: post.body.slice(0, 120),
                  url: `${window.location.origin}/post/${post.id}`,
                })
              }
            >
              <Share2Icon aria-hidden />
              {t("share.share")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={menuItemClass}
              onSelect={() => setSavingImage(true)}
            >
              <DownloadIcon aria-hidden />
              {t("share.saveImage")}
            </DropdownMenuItem>
            {isOwn ? (
              <>
                <DropdownMenuItem
                  className={menuItemClass}
                  onSelect={() => {
                    setEditBody(post.body);
                    setEditing(true);
                  }}
                >
                  <PencilIcon aria-hidden />
                  {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  className={menuItemDestructiveClass}
                  onSelect={() => setConfirmDelete(true)}
                >
                  <Trash2Icon aria-hidden />
                  {t("common.delete")}
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem
                  className={menuItemClass}
                  onSelect={() => setReporting(true)}
                >
                  <FlagIcon aria-hidden />
                  {t("postCard.reportPost")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={menuItemClass}
                  onSelect={() => setBlocking(true)}
                >
                  <BanIcon aria-hidden />
                  {t("postCard.blockUser", { name: post.author_username })}
                </DropdownMenuItem>
              </>
            )}
            {onRemoveFromGroup && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className={menuItemDestructiveClass}
                  onSelect={() => onRemoveFromGroup()}
                >
                  <ShieldOffIcon aria-hidden />
                  {t("postCard.removeFromGroup")}
                </DropdownMenuItem>
              </>
            )}
            {isModerator && !isOwn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className={menuItemDestructiveClass}
                  onSelect={() => setRemoving(true)}
                >
                  <Trash2Icon aria-hidden />
                  {t("postCard.removePost")}
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

      <SaveImageDialog
        content={cardContent}
        onOpenChange={setSavingImage}
        open={savingImage}
      />

      <Dialog open={removing} onOpenChange={setRemoving}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("postCard.removeTitle")}</DialogTitle>
            <DialogDescription>
              {t("postCard.removeDescription")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label={t("postCard.reason")}
            placeholder={t("postCard.reason")}
            value={removeReason}
            onChange={(event) => setRemoveReason(event.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoving(false)}
              disabled={removeContent.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removeContent.isPending || removeReason.trim() === ""}
            >
              {removeContent.isPending && (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              )}
              {t("postCard.removePost")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("postCard.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("postCard.deleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deletePost.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePost.isPending}
            >
              {deletePost.isPending && (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              )}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blocking} onOpenChange={setBlocking}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t("postCard.blockTitle", { name: post.author_username })}
            </DialogTitle>
            <DialogDescription>
              {t("postCard.blockDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBlocking(false)}
              disabled={toggleBlock.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="outline"
              onClick={handleBlock}
              disabled={toggleBlock.isPending}
            >
              {toggleBlock.isPending && (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              )}
              {t("postCard.block")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
