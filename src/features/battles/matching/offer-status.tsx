/**
 * The responder's own offer on one request: pending (with a withdraw
 * control), accepted (with the matched pair's Room ID and the message
 * thread), declined or withdrawn. Renders nothing while the viewer has not
 * offered, so the board can mount it next to every request card.
 */

import { Link } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { directMessagesEnabled } from "@/lib/messages/flag";
import { useBattleCode, useBattleReplies } from "@/lib/battles/queries";
import { useWithdrawBattleOffer } from "@/lib/battles/mutations";

interface OfferStatusProps {
  /** The request the viewer may have offered on. */
  requestId: string;
  /** Override for tests; defaults to the app client. */
  client?: AppSupabaseClient | null;
}

export function OfferStatus({
  requestId,
  client = supabase,
}: OfferStatusProps) {
  const t = useT();
  const { user } = useAuth();
  const replies = useBattleReplies(requestId, client);
  const code = useBattleCode(requestId, client);
  const withdraw = useWithdrawBattleOffer(client);

  const mine = (replies.data ?? []).find(
    (reply) => reply.reply.responder_id === user?.id,
  );
  if (mine === undefined) {
    return null;
  }
  const { reply } = mine;

  async function handleWithdraw(): Promise<void> {
    try {
      await withdraw.mutateAsync(reply.id);
      toast.success(t("battles.withdrawnToast"));
    } catch {
      toast.error(t("battles.actionFailed"));
    }
  }

  const status = reply.status;
  const savedCode = code.data ?? null;

  return (
    <div className="rounded-md border bg-card p-4">
      {status === "pending" ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{t("battles.offerPending")}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleWithdraw()}
            disabled={withdraw.isPending}
          >
            {t("battles.withdrawOffer")}
          </Button>
        </div>
      ) : status === "accepted" ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium">{t("battles.offerAccepted")}</p>
          {savedCode !== null ? (
            <p className="text-sm">
              <span className="text-muted-foreground">
                {t("battles.roomIdLabel")}:{" "}
              </span>
              <span className="font-mono">{savedCode}</span>
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t("battles.codeVisibleHint")}
          </p>
          {directMessagesEnabled() ? (
            <div>
              <Button asChild size="sm" variant="outline">
                <Link to="/messages">{t("battles.openMessages")}</Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : status === "declined" ? (
        <p className="text-sm font-medium">{t("battles.offerDeclined")}</p>
      ) : (
        <p className="text-sm font-medium">{t("battles.offerWithdrawn")}</p>
      )}
    </div>
  );
}
