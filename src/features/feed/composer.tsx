import { useMemo, useState } from "react";
import { LoaderCircleIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Picker } from "@/components/picker";
import { Textarea } from "@/components/ui/textarea";
import { useTeams } from "@/lib/team";
import { useCreatePost } from "@/lib/social/mutations";
import { POST_BODY_MAX } from "@/lib/social/validation";
import { track } from "@/lib/telemetry/analytics";
import { teamAttachment, teamAttachmentJson } from "@/features/feed/attachment";
import type { TeamAttachment } from "@/features/feed/attachment";

/**
 * Post composer for the community feed. One quiet line until focused, then the
 * full composer with the team picker and counter. Pass `groupId` to post into a
 * group instead of the main feed.
 */
export function Composer({ groupId }: { groupId?: string | null }) {
  const { teams } = useTeams();
  const createPost = useCreatePost();
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<TeamAttachment | null>(null);
  const [expanded, setExpanded] = useState(false);

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
      setExpanded(false);
      toast.success("Posted.");
      track("post_created", {
        attachment: attachment ? "team" : "none",
        in_group: Boolean(groupId),
      });
    } else {
      toast.error(result.error.message);
    }
  }

  const pickerOptions = [
    { value: "none", label: "No attachment" },
    ...teams.map((team) => ({ value: team.name, label: team.name })),
  ];

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-2">
        <Textarea
          aria-label="Write a post"
          placeholder="Share a team, a result or a question…"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onFocus={() => setExpanded(true)}
          onBlur={() => {
            if (body.trim() === "" && !attachment) setExpanded(false);
          }}
          rows={1}
          disabled={createPost.isPending}
          className={
            expanded
              ? "min-h-16"
              : "min-h-9 resize-none overflow-hidden py-2"
          }
        />
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={!canPost}
          className="mt-0.5 shrink-0"
        >
          {createPost.isPending ? (
            <LoaderCircleIcon className="animate-spin" aria-hidden />
          ) : (
            <SendIcon aria-hidden />
          )}
          Post
        </Button>
      </div>
      {expanded && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {teams.length > 0 && (
            <Picker
              aria-label="Attach a team"
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
              placeholder="Attach a team"
              className="w-auto max-w-56"
            />
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
            <span className="sr-only">{`Attached team: ${attachment.name}`}</span>
          )}
        </div>
      )}
      {attachment && (
        <p className="mt-2 text-xs text-muted-foreground">
          {`Team "${attachment.name}" will be attached to this post.`}
        </p>
      )}
    </div>
  );
}
