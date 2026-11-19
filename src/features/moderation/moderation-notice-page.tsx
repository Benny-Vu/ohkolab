import { LoaderCircleIcon, SendIcon } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { NotFoundPage } from "@/features/system/not-found-page";
import { ErrorState } from "@/components/error-state";
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
import { useT } from "@/lib/i18n/t";
import {
  APPEAL_MESSAGE_MAX,
  useAppealForAction,
  useCreateAppeal,
  useModerationAction,
  useOwnSuspensions,
} from "@/lib/social/moderation";

function noticeTitle(
  t: ReturnType<typeof useT>,
  action: { action: string; target_type: string } | null,
): string {
  if (action === null) {
    return t("moderation.noticeTitle");
  }
  if (action.action === "suspend") {
    return t("moderation.suspendedTitle");
  }
  if (action.target_type === "post") {
    return t("moderation.postRemovedTitle");
  }
  if (action.target_type === "comment") {
    return t("moderation.commentRemovedTitle");
  }
  return t("moderation.contentRemovedTitle");
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
  const t = useT();
  const statusLabel =
    appeal.status === "open"
      ? t("moderation.underReview")
      : appeal.status === "upheld"
        ? t("moderation.appealUpheld")
        : t("moderation.appealReversed");
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={appeal.status === "reversed" ? "default" : "secondary"}
          >
            {statusLabel}
          </Badge>
          <CardTitle className="text-base">
            {t("moderation.yourAppeal")}
          </CardTitle>
        </div>
        <CardDescription>
          {t("moderation.filedAt", { date: formatDate(appeal.created_at) })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="break-words text-sm text-muted-foreground">
          {appeal.message}
        </p>
        {appeal.status === "open" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("moderation.reviewPending")}
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
  const t = useT();
  const [message, setMessage] = useState("");
  const createAppeal = useCreateAppeal(client);
  const busy = createAppeal.isPending;

  const submit = async () => {
    const trimmed = message.trim();
    if (trimmed === "") {
      toast.error(t("moderation.writeMessage"));
      return;
    }
    const result = await createAppeal.mutateAsync({
      moderationActionId: actionId,
      message: trimmed,
    });
    if (result.ok) {
      toast.success(t("moderation.appealSubmittedToast"));
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t("moderation.appealTitle")}
        </CardTitle>
        <CardDescription>{t("moderation.appealDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Textarea
          aria-label={t("moderation.appealAria")}
          placeholder={t("moderation.appealPlaceholder")}
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
          {t("moderation.submitAppeal")}
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
  const t = useT();
  const { actionId } = useParams<{ actionId: string }>();
  const actionQuery = useModerationAction(actionId ?? "", client);
  const appealQuery = useAppealForAction(actionId ?? "", client);
  const suspensionsQuery = useOwnSuspensions(client);

  if (actionQuery.isPending) {
    return (
      <Page title={t("moderation.noticeTitle")} width="narrow">
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Page>
    );
  }

  if (actionQuery.isError) {
    return (
      <Page title={t("moderation.noticeTitle")} width="narrow">
        <ErrorState
          title={t("moderation.noticeLoadError")}
          description={actionQuery.error.message}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void actionQuery.refetch()}
            >
              {t("common.retry")}
            </Button>
          }
        />
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
    <Page title={noticeTitle(t, action)} width="narrow">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardDescription>{formatDate(action.created_at)}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="break-words text-sm">
              <span className="font-medium">
                {t("moderation.reasonLabel")}{" "}
              </span>
              {action.reason}
            </p>
            {isRemoval && action.content_snapshot !== null ? (
              <div className="grid gap-1 rounded-md border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("moderation.removedContent")}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {action.content_snapshot}
                </p>
              </div>
            ) : null}
            {suspension ? (
              <div className="grid gap-1 rounded-md border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("moderation.suspension")}
                </p>
                <p className="text-sm">
                  {t("moderation.until", {
                    date: formatDate(suspension.until),
                  })}
                </p>
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
