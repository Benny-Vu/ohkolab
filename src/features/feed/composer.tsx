import { useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ImageIcon,
  LoaderCircleIcon,
  SendIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Picker } from "@/components/picker";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/use-auth";
import { useTeams } from "@/lib/team";
import { useT } from "@/lib/i18n/t";
import { useCreatePost } from "@/lib/social/mutations";
import {
  IMAGE_ALT_MAX,
  IMAGE_POSTS_MAX,
  clampImageAlt,
  imagePostsEnabled,
  prepareImage,
  useAttachPostImages,
  type AttachImageInput,
} from "@/lib/social/images";
import { POST_BODY_MAX } from "@/lib/social/validation";
import { track } from "@/lib/telemetry/analytics";
import { teamAttachment, teamAttachmentJson } from "@/features/feed/attachment";
import type { TeamAttachment } from "@/features/feed/attachment";

/** One chosen image: the processed WebP blob plus its composer state. */
interface ImageDraft {
  key: string;
  blob: Blob;
  width: number;
  height: number;
  alt: string;
  previewUrl: string;
}

/**
 * Post composer for the community feed. One quiet line until focused, then the
 * full composer with the team picker and counter. Pass `groupId` to post into
 * a group instead of the main feed. With the VITE_IMAGE_POSTS flag on (and
 * signed in), up to 4 images can be attached: each is scaled and re-encoded
 * as WebP in the browser, uploaded after the post is created, and screened
 * before anyone else sees it.
 */
export function Composer({ groupId }: { groupId?: string | null }) {
  const { user } = useAuth();
  const t = useT();
  const { teams } = useTeams();
  const createPost = useCreatePost();
  const attachImages = useAttachPostImages();
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<TeamAttachment | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [imageDrafts, setImageDrafts] = useState<ImageDraft[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const imagesOn = imagePostsEnabled() && Boolean(user);

  const trimmed = useMemo(() => body.trim(), [body]);
  const posting = createPost.isPending || attachImages.isPending;
  const canPost =
    trimmed !== "" &&
    body.length <= POST_BODY_MAX &&
    !posting &&
    !processingImages;

  async function handleFilesSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    const room = IMAGE_POSTS_MAX - imageDrafts.length;
    if (files.length > room) {
      toast.error(t("composer.tooManyImages", { n: IMAGE_POSTS_MAX }));
    }
    const accepted = files.slice(0, Math.max(0, room));
    if (accepted.length === 0) return;
    setProcessingImages(true);
    const drafts: ImageDraft[] = [];
    for (const [index, file] of accepted.entries()) {
      const result = await prepareImage(file);
      if (result.ok) {
        drafts.push({
          key: `${Date.now()}-${index}-${imageDrafts.length + drafts.length}`,
          blob: result.data.blob,
          width: result.data.width,
          height: result.data.height,
          alt: "",
          previewUrl: URL.createObjectURL(result.data.blob),
        });
      } else {
        toast.error(result.error.message);
      }
    }
    setImageDrafts((previous) => [...previous, ...drafts]);
    setProcessingImages(false);
  }

  function removeDraft(key: string) {
    setImageDrafts((previous) => {
      const removed = previous.find((draft) => draft.key === key);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return previous.filter((draft) => draft.key !== key);
    });
  }

  function moveDraft(key: string, delta: -1 | 1) {
    setImageDrafts((previous) => {
      const index = previous.findIndex((draft) => draft.key === key);
      const target = index + delta;
      if (index === -1 || target < 0 || target >= previous.length) {
        return previous;
      }
      const next = [...previous];
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(target, 0, moved);
      return next;
    });
  }

  function setDraftAlt(key: string, alt: string) {
    setImageDrafts((previous) =>
      previous.map((draft) =>
        draft.key === key ? { ...draft, alt: clampImageAlt(alt) } : draft,
      ),
    );
  }

  async function submit() {
    if (!canPost) return;
    const drafts = imageDrafts;
    const result = await createPost.mutateAsync({
      body,
      attachment: attachment ? teamAttachmentJson(attachment) : null,
      groupId: groupId ?? null,
    });
    if (result.ok) {
      setBody("");
      setAttachment(null);
      setExpanded(false);
      for (const draft of drafts) URL.revokeObjectURL(draft.previewUrl);
      setImageDrafts([]);
      track("post_created", {
        attachment: attachment ? "team" : "none",
        in_group: Boolean(groupId),
      });
      if (!imagesOn || drafts.length === 0 || !result.data) {
        toast.success(t("composer.posted"));
        return;
      }
      const attach = await attachImages.mutateAsync({
        postId: result.data.id,
        images: drafts.map<AttachImageInput>((draft) => ({
          blob: draft.blob,
          width: draft.width,
          height: draft.height,
          alt: draft.alt,
        })),
      });
      if (!attach.ok) {
        toast.error(attach.error.message);
        return;
      }
      for (const outcome of attach.data) {
        if (outcome.error) toast.error(outcome.error.message);
      }
      const uploaded = attach.data.filter((outcome) => outcome.uploaded);
      if (uploaded.length === 0) return;
      toast.success(t("composer.postedImages"));
      if (uploaded.some((outcome) => !outcome.screened)) {
        toast.info(t("composer.imageChecking"));
      }
    } else {
      toast.error(result.error.message);
    }
  }

  const pickerOptions = [
    { value: "none", label: t("composer.noAttachment") },
    ...teams.map((team) => ({ value: team.name, label: team.name })),
  ];

  return (
    <div ref={rootRef} className="rounded-md border bg-card p-3">
      <div className="flex items-start gap-2">
        <Textarea
          aria-label={t("composer.aria")}
          placeholder={t("composer.placeholder")}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onFocus={() => setExpanded(true)}
          onBlur={(event) => {
            // Keep the composer open while focus moves within it (to the
            // image picker or a description field), and while any image is
            // being processed.
            const focusInside =
              rootRef.current?.contains(event.relatedTarget as Node | null) ??
              false;
            if (
              body.trim() === "" &&
              !attachment &&
              imageDrafts.length === 0 &&
              !processingImages &&
              !focusInside
            ) {
              setExpanded(false);
            }
          }}
          rows={1}
          disabled={posting}
          className={
            expanded ? "min-h-16" : "min-h-9 resize-none overflow-hidden py-2"
          }
        />
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={!canPost}
          className="mt-0.5 shrink-0"
        >
          {posting ? (
            <LoaderCircleIcon className="animate-spin" aria-hidden />
          ) : (
            <SendIcon aria-hidden />
          )}
          {t("composer.post")}
        </Button>
      </div>
      {expanded && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {teams.length > 0 && (
            <Picker
              aria-label={t("composer.attachTeam")}
              options={pickerOptions}
              value={attachment ? attachment.name : "none"}
              onValueChange={(value) => {
                if (value === "none" || value === "") {
                  setAttachment(null);
                  return;
                }
                const team = teams.find(
                  (candidate) => candidate.name === value,
                );
                if (team) setAttachment(teamAttachment(team));
              }}
              placeholder={t("composer.attachTeam")}
              className="w-auto max-w-56"
            />
          )}
          {imagesOn && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                aria-label={t("composer.chooseImages")}
                className="hidden"
                onChange={handleFilesSelected}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={
                  imageDrafts.length >= IMAGE_POSTS_MAX || processingImages
                }
              >
                {processingImages ? (
                  <LoaderCircleIcon className="animate-spin" aria-hidden />
                ) : (
                  <ImageIcon aria-hidden />
                )}
                {t("composer.addImages")}
              </Button>
            </>
          )}
          <span
            className={
              body.length > POST_BODY_MAX
                ? "ml-auto text-xs text-destructive"
                : "ml-auto text-xs text-muted-foreground"
            }
          >
            {body.length}/{POST_BODY_MAX}
          </span>
          {attachment && (
            <span className="sr-only">
              {t("composer.attachedTeamSr", { name: attachment.name })}
            </span>
          )}
        </div>
      )}
      {imageDrafts.length > 0 && (
        <ul
          className="mt-2 grid gap-2"
          aria-label={t("composer.imagesToAttach")}
        >
          {imageDrafts.map((draft, index) => (
            <li
              key={draft.key}
              className="flex items-center gap-2 rounded-md border bg-surface-sunken p-2"
            >
              <img
                src={draft.previewUrl}
                alt={draft.alt || t("composer.imageAlt", { n: index + 1 })}
                className="size-12 shrink-0 rounded object-cover"
              />
              <Input
                value={draft.alt}
                maxLength={IMAGE_ALT_MAX}
                placeholder={t("composer.addDescription")}
                aria-label={t("composer.describeImage", { n: index + 1 })}
                onChange={(event) => setDraftAlt(draft.key, event.target.value)}
                className="text-sm"
              />
              <div className="flex shrink-0 items-center">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={t("composer.moveLeft", { n: index + 1 })}
                  disabled={index === 0}
                  onClick={() => moveDraft(draft.key, -1)}
                >
                  <ArrowLeftIcon aria-hidden />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={t("composer.moveRight", { n: index + 1 })}
                  disabled={index === imageDrafts.length - 1}
                  onClick={() => moveDraft(draft.key, 1)}
                >
                  <ArrowRightIcon aria-hidden />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={t("composer.removeImage", { n: index + 1 })}
                  onClick={() => removeDraft(draft.key)}
                >
                  <XIcon aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {attachment && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("composer.attachedTeam", { name: attachment.name })}
        </p>
      )}
    </div>
  );
}
