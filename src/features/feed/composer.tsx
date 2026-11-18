import { useMemo, useState } from "react";
import { LoaderCircleIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTeams } from "@/lib/team";
import { useCreatePost } from "@/lib/social/mutations";
import { POST_BODY_MAX } from "@/lib/social/validation";
import { track } from "@/lib/telemetry/analytics";
import { teamAttachment, teamAttachmentJson } from "@/features/feed/attachment";
import type { TeamAttachment } from "@/features/feed/attachment";

/**
 * Post composer for the community feed. Signed-in users write a short post and
 * can attach one of their teams as a snapshot. Pass `groupId` to post into a
 * group instead of the main feed.
 */
export function Composer({ groupId }: { groupId?: string | null }) {
  const { teams } = useTeams();
  const createPost = useCreatePost();
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<TeamAttachment | null>(null);

  const trimmed = useMemo(() => body.trim(), [body]);
  const canPost =
    trimmed !== "" && body.length <= POST_BODY_MAX && !createPost.isPending;

  async function submit() {
    if (!canPost) return;
    const result = await createPost.mutateAsync({
      body,
      attachment: attachment ? teamAttachmentJson(attachment) : null,
      groupId: groupId ?? null,
    });
    if (result.ok) {
      setBody("");
      setAttachment(null);
      toast.success("Posted.");
      track("post_created", {
        attachment: attachment ? "team" : "none",
        in_group: Boolean(groupId),
      });
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <Textarea
        aria-label="Write a post"
        placeholder="Share a team, a result or a question…"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        disabled={createPost.isPending}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {teams.length > 0 && (
          <Select
            value={attachment ? attachment.name : "none"}
            onValueChange={(value) => {
              if (value === "none") {
                setAttachment(null);
                return;
              }
              const team = teams.find((candidate) => candidate.name === value);
              if (team) setAttachment(teamAttachment(team));
            }}
          >
            <SelectTrigger
              aria-label="Attach a team"
              className="w-auto max-w-56"
            >
              <SelectValue placeholder="Attach a team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No attachment</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.name}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Button type="button" size="sm" onClick={submit} disabled={!canPost}>
          {createPost.isPending ? (
            <LoaderCircleIcon className="animate-spin" aria-hidden />
          ) : (
            <SendIcon aria-hidden />
          )}
          Post
        </Button>
        {attachment && (
          <span className="sr-only">{`Attached team: ${attachment.name}`}</span>
        )}
      </div>
      {attachment && (
        <p className="mt-2 text-xs text-muted-foreground">
          {`Team "${attachment.name}" will be attached to this post.`}
        </p>
      )}
    </div>
  );
}
