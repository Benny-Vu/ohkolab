/**
 * The matched banner: what either player of a matched battle request
 * sees. The Room ID exchange leads — it is the common path, since most
 * matched pairs are not friends and open no message thread — with the
 * direct-message link (when the feature is on) as the bonus, and the
 * "we played" toggle for both players. Every matching rule lives server
 * side; this only renders the matched state and maps write failures to
 * one friendly toast.
 */

import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonSmTouchClass } from "@/components/touch-targets";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { directMessagesEnabled } from "@/lib/messages/flag";
import { useBattleCode, useBattleReplies } from "@/lib/battles/queries";
import type { BattleRequestSummary } from "@/lib/battles/logic";
import { useMarkBattlePlayed, useSetBattleCode } from "@/lib/battles/mutations";

/** The Room ID field's length limits, mirrored from the database. */
const CODE_MIN_LENGTH = 1;
const CODE_MAX_LENGTH = 64;

interface MatchedBannerProps {
  /** The author's matched request, with its author and team resolved. */
  summary: BattleRequestSummary;
  /** Override for tests; defaults to the app client. */
  client?: AppSupabaseClient | null;
}

export function MatchedBanner({
  summary,
  client = supabase,
}: MatchedBannerProps) {
  const t = useT();
  const { user } = useAuth();
  const { request } = summary;
  const replies = useBattleReplies(request.id, client);
  const code = useBattleCode(request.id, client);
  const setCode = useSetBattleCode(client);
  const markPlayed = useMarkBattlePlayed(client);
  // null while the field mirrors the saved code; typing switches to the draft.
  const [draft, setDraft] = useState<string | null>(null);

  const accepted = (replies.data ?? []).find(
    (reply) => reply.reply.id === request.accepted_reply_id,
  );
  // Either player sees the banner; the partner is always the other one:
  // the accepted responder for the author, the author for the responder.
  const isAuthor = user?.id === request.author_id;
  const partner = isAuthor ? (accepted?.responder ?? null) : summary.author;
  const partnerName = partner?.display_name ?? partner?.username ?? null;
  const savedCode = code.data ?? null;
  const value = draft ?? savedCode ?? "";
  const inputId = `battle-code-${request.id}`;

  async function handleSave(): Promise<void> {
    const trimmed = value.trim();
    if (trimmed.length < CODE_MIN_LENGTH) {
      return;
    }
    try {
      await setCode.mutateAsync({ requestId: request.id, code: trimmed });
      setDraft(null);
      toast.success(t("battles.codeSavedToast"));
    } catch {
      toast.error(t("battles.actionFailed"));
    }
  }

  async function handleMarkPlayed(): Promise<void> {
    try {
      await markPlayed.mutateAsync(request.id);
    } catch {
      toast.error(t("battles.actionFailed"));
    }
  }

  return (
    <div className="rounded-md border border-accent-brand-text/40 bg-accent-brand-subtle p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{t("battles.statusMatched")}</Badge>
        {partnerName ? (
          <p className="text-sm font-medium">
            {t("battles.matchedTitle", { name: partnerName })}
          </p>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          {t("battles.roomIdLabel")}
        </label>
        <div className="flex gap-2">
          <Input
            id={inputId}
            value={value}
            maxLength={CODE_MAX_LENGTH}
            placeholder={t("battles.roomIdPlaceholder")}
            onChange={(event) => setDraft(event.target.value)}
            className="font-mono max-sm:h-11"
          />
          <Button
            size="sm"
            className={buttonSmTouchClass}
            onClick={() => void handleSave()}
            loading={setCode.isPending}
            disabled={setCode.isPending || value.trim().length === 0}
          >
            {t("battles.save")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("battles.codeVisibleHint")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("battles.codeFallbackHint")}
        </p>
      </div>
      {directMessagesEnabled() ? (
        <Button
          asChild
          size="sm"
          variant="outline"
          className={`mt-3 ${buttonSmTouchClass}`}
        >
          <Link to="/messages">{t("battles.openMessages")}</Link>
        </Button>
      ) : null}
      {request.played_at === null ? (
        <Button
          variant="outline"
          size="sm"
          className={`mt-3 ${buttonSmTouchClass}`}
          onClick={() => void handleMarkPlayed()}
          loading={markPlayed.isPending}
          disabled={markPlayed.isPending}
        >
          {t("battles.markPlayed")}
        </Button>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckIcon className="size-4" aria-hidden />
          {t("battles.playedLine")}
        </p>
      )}
    </div>
  );
}
