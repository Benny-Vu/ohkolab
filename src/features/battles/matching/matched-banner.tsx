/**
 * The matched banner: what the author of a matched battle request sees.
 * The two players, the direct-message thread (when the feature is on), the
 * Room ID exchange and the "we played" toggle. Every matching rule lives
 * server side; this only renders the matched state and maps write failures
 * to one friendly toast.
 */

import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const partner = accepted?.responder ?? null;
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
      {directMessagesEnabled() ? (
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link to="/messages">{t("battles.openMessages")}</Link>
        </Button>
      ) : null}
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
            className="font-mono"
          />
          <Button
            size="sm"
            onClick={() => void handleSave()}
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
      {request.played_at === null ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void handleMarkPlayed()}
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
