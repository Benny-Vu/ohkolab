/**
 * The author's own battle requests: every request whatever its status, with
 * its offers (accept or decline), the close/reopen control, and the matched
 * banner once a request is matched. Self-contained so the board page can
 * compose it; all matching rules live server side, failures map to one
 * friendly toast.
 */

import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { LoadingArea, TextLinesSkeleton } from "@/components/skeletons";
import { UserAvatar } from "@/components/user-avatar";
import { useT, type TranslationParams } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { directMessagesEnabled } from "@/lib/messages/flag";
import { useMyBattleRequests, useBattleReplies } from "@/lib/battles/queries";
import type {
  BattleRequestSummary,
  BattleReplySummary,
} from "@/lib/battles/logic";
import {
  useAcceptBattleOffer,
  useDeclineBattleOffer,
  useSetBattleRequestOpen,
} from "@/lib/battles/mutations";
import { MatchedBanner } from "@/features/battles/matching/matched-banner";

interface PanelProps {
  /** Override for tests; defaults to the app client. */
  client?: AppSupabaseClient | null;
}

/** The status word per request status; unknown statuses show no badge. */
const STATUS_KEYS: Record<string, TranslationKey> = {
  open: "battles.statusOpen",
  matched: "battles.statusMatched",
  closed: "battles.statusClosed",
  expired: "battles.statusExpired",
};

export function MyBattleRequestsPanel({ client = supabase }: PanelProps) {
  const t = useT();
  const mine = useMyBattleRequests(client);

  if (mine.isPending) {
    return (
      <LoadingArea
        pending
        label={t("battles.loadingMyRequestsAria")}
        skeleton={<TextLinesSkeleton lines={4} />}
      />
    );
  }

  const requests = mine.data ?? [];
  if (requests.length === 0) {
    return <EmptyState title={t("battles.noRequests")} />;
  }

  return (
    <section className="grid gap-3" aria-label={t("battles.myRequestsTitle")}>
      <h2 className="font-heading text-sm font-semibold">
        {t("battles.myRequestsTitle")}
      </h2>
      <ul className="grid gap-3">
        {requests.map((summary) => (
          <li key={summary.request.id}>
            <MyRequestCard summary={summary} client={client} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface RequestCardProps {
  summary: BattleRequestSummary;
  client: AppSupabaseClient | null;
}

function MyRequestCard({ summary, client }: RequestCardProps) {
  const t = useT();
  const { request } = summary;
  const setOpen = useSetBattleRequestOpen(client);
  const statusKey = STATUS_KEYS[request.status] ?? null;

  async function handleSetOpen(open: boolean): Promise<void> {
    try {
      await setOpen.mutateAsync({ requestId: request.id, open });
    } catch {
      toast.error(t("battles.actionFailed"));
    }
  }

  return (
    <article className="rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 truncate font-heading text-sm font-semibold">
          {request.rules}
        </span>
        {statusKey ? <Badge variant="secondary">{t(statusKey)}</Badge> : null}
      </div>
      {request.note ? (
        <p className="mt-2 text-sm text-muted-foreground">{request.note}</p>
      ) : null}
      {request.status === "open" ? (
        <div className="mt-3 grid gap-3">
          <OffersSection requestId={request.id} client={client} />
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSetOpen(false)}
              disabled={setOpen.isPending}
            >
              {t("battles.closeRequest")}
            </Button>
          </div>
        </div>
      ) : request.status === "matched" ? (
        <div className="mt-3">
          <MatchedBanner summary={summary} client={client} />
        </div>
      ) : request.status === "closed" ? (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleSetOpen(true)}
            disabled={setOpen.isPending}
          >
            {t("battles.reopenRequest")}
          </Button>
        </div>
      ) : null}
    </article>
  );
}

interface OffersSectionProps {
  requestId: string;
  client: AppSupabaseClient | null;
}

function OffersSection({ requestId, client }: OffersSectionProps) {
  const t = useT();
  const navigate = useNavigate();
  const replies = useBattleReplies(requestId, client);
  const accept = useAcceptBattleOffer(client);
  const decline = useDeclineBattleOffer(client);

  const offers = replies.data ?? [];

  async function handleAccept(replyId: string): Promise<void> {
    try {
      const conversationId = await accept.mutateAsync(replyId);
      if (conversationId !== null && directMessagesEnabled()) {
        // The thread opens at /messages/<id>; the toast carries the link.
        toast.success(t("battles.acceptedToast"), {
          action: {
            label: t("battles.openConversation"),
            onClick: () => navigate(`/messages/${conversationId}`),
          },
        });
      } else {
        // No DM thread could open (or DMs are off): the pair exchanges the
        // in-game code inside the request instead.
        toast.success(t("battles.acceptedNoDmToast"));
      }
    } catch {
      toast.error(t("battles.actionFailed"));
    }
  }

  async function handleDecline(replyId: string): Promise<void> {
    try {
      await decline.mutateAsync(replyId);
      toast.success(t("battles.declinedToast"));
    } catch {
      toast.error(t("battles.actionFailed"));
    }
  }

  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        {t("battles.offersHeading")}
      </h3>
      {offers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("battles.noOffers")}</p>
      ) : (
        <ul className="grid gap-1.5">
          {offers.map((offer) => (
            <li key={offer.reply.id}>
              <OfferRow
                offer={offer}
                acceptPending={accept.isPending}
                declinePending={decline.isPending}
                onAccept={() => void handleAccept(offer.reply.id)}
                onDecline={() => void handleDecline(offer.reply.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface OfferRowProps {
  offer: BattleReplySummary;
  acceptPending: boolean;
  declinePending: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

function OfferRow({
  offer,
  acceptPending,
  declinePending,
  onAccept,
  onDecline,
}: OfferRowProps) {
  const t = useT();
  const responder = offer.responder;
  const name = responder?.display_name ?? responder?.username ?? "";
  const nameParams: TranslationParams | undefined =
    name === "" ? undefined : { name };
  const status = offer.reply.status;

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md p-1 hover:bg-surface-sunken duration-(--motion-fast) ease-(--motion-ease-out)">
      <UserAvatar
        username={responder?.username ?? "?"}
        displayName={responder?.display_name ?? null}
        avatarSpecies={responder?.avatar_species ?? null}
        size="sm"
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {name === "" ? t("battles.someone") : name}
        {status === "declined" ? (
          <span className="text-xs text-muted-foreground">
            {" "}
            {t("battles.declinedLabel")}
          </span>
        ) : null}
        {status === "withdrawn" ? (
          <span className="text-xs text-muted-foreground">
            {" "}
            {t("battles.withdrawnLabel")}
          </span>
        ) : null}
      </span>
      {status === "pending" ? (
        <span className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            aria-label={
              nameParams ? t("battles.acceptFrom", nameParams) : undefined
            }
            onClick={onAccept}
            disabled={acceptPending}
          >
            {t("battles.accept")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label={
              nameParams ? t("battles.declineFrom", nameParams) : undefined
            }
            onClick={onDecline}
            disabled={declinePending}
          >
            {t("battles.decline")}
          </Button>
        </span>
      ) : null}
    </div>
  );
}
