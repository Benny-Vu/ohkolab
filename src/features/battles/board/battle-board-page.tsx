import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { Page } from "@/components/page";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { SegmentedControl } from "@/components/segmented-control";
import { buttonSmTouchClass, switchHitClass } from "@/components/touch-targets";
import { TeamPreview } from "@/components/team-preview/team-preview";
import { UserAvatar } from "@/components/user-avatar";
import { DemoBattleList } from "@/components/demo-battle-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AvatarListSkeleton, LoadingArea } from "@/components/skeletons";
import { useAuth } from "@/lib/auth/use-auth";
import { isDemoMode } from "@/lib/demo-mode";
import { useLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import {
  formatBattleTime,
  NO_BATTLE_FILTER,
  type BattleFilter,
  type BattleRequestSummary,
} from "@/lib/battles/logic";
import {
  useBattleBoard,
  useMyBattleRequests,
  useMyMatches,
} from "@/lib/battles/queries";
import { useOfferToBattle } from "@/lib/battles/mutations";
import { BattleRequestDialog } from "@/features/battles/board/battle-request-dialog";
import { ReportBattleButton } from "@/features/battles/board/report-battle-dialog";
import { MatchedBanner } from "@/features/battles/matching/matched-banner";
import { MyBattleRequestsPanel } from "@/features/battles/matching/my-battle-requests-panel";
import { OfferStatus } from "@/features/battles/matching/offer-status";

/**
 * /battles: the battle board. Open requests for a Champions match, filtered
 * by format, language and "starting soon", each with an offer button and a
 * report route through the moderation queue. The times are always the
 * viewer's own clock. Signed-out visitors see the sign-in card (and, in
 * recording mode, the sample requests below it).
 */
export function BattleBoardPage({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const { user } = useAuth();
  const t = useT();
  const [filter, setFilter] = useState<BattleFilter>(NO_BATTLE_FILTER);
  const board = useBattleBoard(filter, client);
  // Both reuse cached queries; empty lists render nothing, so the board
  // stays the page's main content for users with no requests or matches.
  const myMatches = useMyMatches(client);
  const mine = useMyBattleRequests(client);

  const requests = board.data ?? [];
  const filtersActive =
    filter.format !== "all" || filter.language !== "all" || filter.startingSoon;

  return (
    <Page
      title={t("battles.title")}
      description={t("battles.description")}
      width="wide"
      actions={user ? <BattleRequestDialog client={client} /> : null}
    >
      {user === null ? (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <EmptyState
            title={t("battles.signInToBattle")}
            action={
              <Button asChild size="sm" className={buttonSmTouchClass}>
                <Link to="/login?returnTo=/battles">{t("common.signIn")}</Link>
              </Button>
            }
          />
          {isDemoMode() && <DemoBattleList />}
        </div>
      ) : (
        <>
          {(myMatches.data ?? []).length > 0 && (
            <section
              className="mb-6 grid gap-3"
              aria-label={t("battles.myMatchesTitle")}
            >
              <h2 className="font-heading text-sm font-semibold">
                {t("battles.myMatchesTitle")}
              </h2>
              {(myMatches.data ?? []).map((summary) => (
                <MatchedBanner
                  key={summary.request.id}
                  summary={summary}
                  client={client}
                />
              ))}
            </section>
          )}

          {(mine.data ?? []).length > 0 && (
            <div className="mb-6">
              <MyBattleRequestsPanel client={client} />
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <SegmentedControl
              aria-label={t("battles.filterFormatAria")}
              value={filter.format}
              onValueChange={(value) =>
                setFilter({
                  ...filter,
                  format:
                    value === "singles" || value === "doubles" ? value : "all",
                })
              }
              options={[
                { value: "all", label: t("battles.formatAll") },
                { value: "singles", label: t("battles.formatSingles") },
                { value: "doubles", label: t("battles.formatDoubles") },
              ]}
            />
            <SegmentedControl
              aria-label={t("battles.filterLanguageAria")}
              value={filter.language}
              onValueChange={(value) =>
                setFilter({
                  ...filter,
                  language: value === "en" || value === "ja" ? value : "all",
                })
              }
              options={[
                { value: "all", label: t("battles.languageAll") },
                { value: "en", label: t("language.english") },
                { value: "ja", label: t("language.japanese") },
              ]}
            />
            <span className="flex items-center gap-2 text-sm font-medium">
              <Switch
                className={switchHitClass}
                aria-label={t("battles.startingSoon")}
                checked={filter.startingSoon}
                onCheckedChange={(checked) =>
                  setFilter({ ...filter, startingSoon: checked })
                }
              />
              {t("battles.startingSoon")}
            </span>
          </div>

          <div className="mt-4">
            {board.isError ? (
              <ErrorState
                title={t("battles.loadError")}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    className={buttonSmTouchClass}
                    onClick={() => void board.refetch()}
                  >
                    {t("common.retry")}
                  </Button>
                }
              />
            ) : (
              <LoadingArea
                pending={board.isPending}
                label={t("battles.loadingAria")}
                skeleton={<AvatarListSkeleton count={3} />}
              >
                {requests.length === 0 ? (
                  <EmptyState
                    title={
                      filtersActive
                        ? t("battles.noMatches")
                        : t("battles.emptyTitle")
                    }
                    description={
                      filtersActive ? undefined : t("battles.emptyDescription")
                    }
                  />
                ) : (
                  <ul className="grid gap-3 lg:grid-cols-2">
                    {requests.map((summary) => (
                      <li key={summary.request.id}>
                        <BattleCard summary={summary} client={client} />
                      </li>
                    ))}
                  </ul>
                )}
              </LoadingArea>
            )}
          </div>
        </>
      )}
    </Page>
  );
}

/** Maps a raw offer error to a friendly bilingual toast string. */
function offerErrorMessage(
  raw: string | undefined,
  t: ReturnType<typeof useT>,
): string {
  if (
    raw?.includes("duplicate key") ||
    raw?.includes("unique constraint") ||
    raw?.includes("already offered")
  ) {
    return t("battles.errorAlreadyOffered");
  }
  if (raw?.includes("Too many")) {
    return t("battles.errorOfferCap");
  }
  return t("battles.errorGeneric");
}

function BattleCard({
  summary,
  client = supabase,
}: {
  summary: BattleRequestSummary;
  client?: AppSupabaseClient | null;
}) {
  const { user } = useAuth();
  const t = useT();
  const [locale] = useLocale();
  const offer = useOfferToBattle(client);
  const [offered, setOffered] = useState(false);

  const { request, author, team } = summary;
  // Read before the author ternary narrows the type; the fallback line needs
  // it even when the author did not resolve.
  const handle = author?.username ?? "?";
  const isOwn = user?.id === request.author_id;
  const showActions = user !== null && !isOwn;

  // The board always speaks the viewer's clock: their zone (the runtime
  // default) and their locale, with the requester's zone only as a hint.
  const starts = formatBattleTime(request.starts_at, undefined, locale);
  const ends = formatBattleTime(request.ends_at, undefined, locale);
  const timePhrase =
    starts !== null && ends !== null
      ? t("battles.window", { start: starts, end: ends })
      : starts !== null
        ? t("battles.startsAt", { time: starts })
        : ends !== null
          ? t("battles.until", { time: ends })
          : null;

  async function handleOffer() {
    try {
      await offer.mutateAsync(request.id);
      setOffered(true);
      toast.success(t("battles.offered"));
    } catch (mutationError) {
      const message = (mutationError as { message?: string } | null)?.message;
      toast.error(offerErrorMessage(message, t));
    }
  }

  return (
    <article className="rounded-md border bg-card p-4">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar
          username={author?.username ?? "?"}
          displayName={author?.display_name}
          avatarSpecies={author?.avatar_species}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          {author ? (
            // The whole name block is the link, so the tap target covers
            // both lines (design-rules.md: Touch targets).
            <Link
              to={`/u/${author.username}`}
              className="block truncate text-sm font-medium hover:underline max-sm:py-1"
            >
              {author.display_name ?? author.username}
              <span className="block truncate text-xs font-normal text-muted-foreground">
                @{author.username}
              </span>
            </Link>
          ) : (
            <>
              <p className="truncate text-sm font-medium">
                {t("battles.unknownAuthor")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{handle}
              </p>
            </>
          )}
        </div>
        {showActions && (
          <ReportBattleButton requestId={request.id} client={client} />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {t(
            request.format === "doubles"
              ? "battles.formatDoubles"
              : "battles.formatSingles",
          )}
        </Badge>
        <Badge variant="outline">
          {t(
            request.language === "ja"
              ? "language.japanese"
              : "language.english",
          )}
        </Badge>
      </div>

      <p className="mt-2 font-heading text-sm font-semibold">{request.rules}</p>
      {request.note && (
        <p className="mt-1 text-sm text-muted-foreground">{request.note}</p>
      )}
      {timePhrase && (
        <p className="mt-2 text-xs text-muted-foreground">{timePhrase}</p>
      )}

      {team && (
        <div className="mt-3 rounded-md border bg-surface-sunken p-3">
          <p className="min-w-0 truncate text-sm font-medium">{team.name}</p>
          <div className="mt-2">
            <TeamPreview
              team={{ members: team.data }}
              variant="compact"
              ariaLabel={team.name}
            />
          </div>
        </div>
      )}

      {showActions && (
        <>
          <Button
            className={`mt-3 ${buttonSmTouchClass}`}
            size="sm"
            variant="outline"
            onClick={() => void handleOffer()}
            loading={offer.isPending}
            disabled={offer.isPending || offered}
          >
            {offered ? t("battles.offered") : t("battles.offer")}
          </Button>
          {/* The viewer's own offer, once made: pending (withdraw),
              accepted (Room ID and thread) or declined. Renders nothing
              while they have not offered. */}
          <div className="mt-3">
            <OfferStatus requestId={request.id} client={client} />
          </div>
        </>
      )}
    </article>
  );
}
