import { LoaderCircleIcon, SendIcon } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { NotFoundPage } from "@/features/system/not-found-page";
import { Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { formatDate } from "@/lib/format-date";
import {
  APPEAL_MESSAGE_MAX,
  useAppealForAction,
  useCreateAppeal,
  useModerationAction,
  useModerationTargetText,
  useOwnSuspensions,
} from "@/lib/social/moderation";

function noticeTitle(
  action: { action: string; target_type: string } | null,
): string {
  if (action === null) {
    return "Moderation notice";
  }
  if (action.action === "suspend") {
    return "Your account was suspended";
  }
  if (action.target_type === "post") {
    return "Your post was removed";
  }
  if (action.target_type === "comment") {
    return "Your comment was removed";
  }
  return "Your content was removed";
}

function AppealStatus({
  appeal,
}: {
  appeal: {
    status: string;
    created_at: string;
    message: string;
  };
}) {
  const statusLabel =
    appeal.status === "open"
      ? "Under review"
      : appeal.status === "upheld"
        ? "Appeal upheld"
        : "Appeal reversed";
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={appeal.status === "reversed" ? "default" : "secondary"}
          >
            {statusLabel}
          </Badge>
          <CardTitle className="text-base">Your appeal</CardTitle>
        </div>
        <CardDescription>Filed {formatDate(appeal.created_at)}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{appeal.message}</p>
        {appeal.status === "open" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            A moderator will review your appeal and update its status here.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AppealForm({
  actionId,
  client,
}: {
  actionId: string;
  client: AppSupabaseClient | null;
}) {
  const [message, setMessage] = useState("");
  const createAppeal = useCreateAppeal(client);
  const busy = createAppeal.isPending;

  const submit = async () => {
    const trimmed = message.trim();
    if (trimmed === "") {
      toast.error("Write a message for the moderators.");
      return;
    }
    const result = await createAppeal.mutateAsync({
      moderationActionId: actionId,
      message: trimmed,
    });
    if (result.ok) {
      toast.success("Appeal submitted.");
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appeal this decision</CardTitle>
        <CardDescription>
          Explain why you think this action was wrong. A moderator will review
          your appeal.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Textarea
          aria-label="Appeal message"
          placeholder="Why should this decision be reconsidered?"
          value={message}
          maxLength={APPEAL_MESSAGE_MAX}
          onChange={(event) => setMessage(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {message.length}/{APPEAL_MESSAGE_MAX}
        </p>
        <Button
          className="justify-self-start"
          disabled={busy || message.trim() === ""}
          onClick={() => {
            void submit();
          }}
        >
          {busy ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />}
          Submit appeal
        </Button>
      </CardContent>
    </Card>
  );
}

export function ModerationNoticePage({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const { actionId } = useParams<{ actionId: string }>();
  const actionQuery = useModerationAction(actionId ?? "", client);
  const appealQuery = useAppealForAction(actionId ?? "", client);
  const suspensionsQuery = useOwnSuspensions(client);
  const targetTextQuery = useModerationTargetText(
    actionQuery.data ?? null,
    client,
  );

  if (actionQuery.isPending) {
    return (
      <Page title="Moderation notice" width="narrow">
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Page>
    );
  }

  const action = actionQuery.data ?? null;

  if (action === null) {
    return <NotFoundPage />;
  }

  const appeal = appealQuery.data ?? null;
  const isRemoval = action.action === "remove";
  const suspension =
    action.action === "suspend"
      ? ((suspensionsQuery.data ?? [])[0] ?? null)
      : null;

  return (
    <Page title={noticeTitle(action)} width="narrow">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardDescription>{formatDate(action.created_at)}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm">
              <span className="font-medium">Reason: </span>
              {action.reason}
            </p>
            {isRemoval && targetTextQuery.data ? (
              <blockquote className="border-l-2 pl-3 text-sm text-muted-foreground">
                {targetTextQuery.data}
              </blockquote>
            ) : null}
            {suspension ? (
              <div className="grid gap-1 rounded-md border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Suspension
                </p>
                <p className="text-sm">Until {formatDate(suspension.until)}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
        {isRemoval ? (
          appeal ? (
            <AppealStatus appeal={appeal} />
          ) : (
            <AppealForm actionId={action.id} client={client} />
          )
        ) : null}
      </div>
    </Page>
  );
}
