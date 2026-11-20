import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRightIcon,
  CalculatorIcon,
  ChartColumnIcon,
  SwordsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Logo } from "@/components/logo";
import { Picker } from "@/components/picker";
import { SegmentedControl } from "@/components/segmented-control";
import {
  LoadingArea,
  PostListSkeleton,
  TextLinesSkeleton,
} from "@/components/skeletons";
import { useAuth } from "@/lib/auth/use-auth";
import { isDemoMode } from "@/lib/demo-mode";
import { useMyGroups } from "@/lib/groups/queries";
import { getLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";
import { socialAvailability } from "@/lib/social/availability";
import { useFeed, type FeedLanguage } from "@/lib/social/queries";
import { DemoPostList } from "@/components/demo-post-list";
import { Composer } from "@/features/feed/composer";
import { PostList } from "@/features/feed/post-list";
import { PeopleToFollow } from "@/features/home/people-to-follow";

interface Tool {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Asks the app layout to warm the Groups screen on hover/focus. The
 * event (not an import) keeps this feature's graph free of other
 * features' chunks; see src/app/prefetch.ts.
 */
function prefetchGroups(): void {
  window.dispatchEvent(
    new CustomEvent("ohkolab:prefetch", { detail: "/groups" }),
  );
}

/**
 * Home screen: the community feed once the social layer is ready, with the
 * tools intro as the fallback.
 */
export function HomePage() {
  if (socialAvailability() !== "ready") {
    return <ToolsIntro />;
  }
  return <FeedHome />;
}

function ToolsIntro() {
  const t = useT();
  const tools: Tool[] = [
    {
      to: "/calc",
      title: t("home.calcTitle"),
      description: t("home.calcDescription"),
      icon: CalculatorIcon,
    },
    {
      to: "/teams",
      title: t("home.teamsTitle"),
      description: t("home.teamsDescription"),
      icon: SwordsIcon,
    },
    {
      to: "/meta",
      title: t("home.metaTitle"),
      description: t("home.metaDescription"),
      icon: ChartColumnIcon,
    },
  ];
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="text-primary">OHKO</span>Lab
      </h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        {t("home.introTagline")}
      </p>

      <ul className="mt-8 grid gap-3">
        {tools.map((tool) => (
          <li key={tool.to}>
            <Link
              to={tool.to}
              className="block rounded-md focus-visible:outline-2"
            >
              <div className="flex items-center gap-4 rounded-md border bg-card p-4 transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:bg-surface-sunken">
                <tool.icon
                  className="size-6 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-base font-semibold">
                    {tool.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tool.description}
                  </p>
                </div>
                <ArrowRightIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-muted-foreground md:hidden">
        {t("footer.disclaimer")}
      </p>
    </div>
  );
}

function FeedHome() {
  const { user } = useAuth();
  const t = useT();
  const [tab, setTab] = useState<"latest" | "following">("latest");
  // The filter starts from the site language; "all" shows every post,
  // untagged ones included.
  const [language, setLanguage] = useState<FeedLanguage>(() =>
    getLocale() === "ja" ? "ja" : "en",
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
      {/* One h1 per page: the feed has no visible title, so it is screen-reader
       * only; the signed-out intro keeps its visible heading as plain text. */}
      <h1 className="sr-only">OHKOLab</h1>
      <div className="min-w-0">
        {!user && <SignedOutIntro />}

        {/* Recording mode never shows the composer: demo mode must not be a
         * way to post or change data. */}
        {user && !isDemoMode() && (
          <div className="mb-4">
            <Composer />
          </div>
        )}

        {/* People to follow sits right above the feed, so it also answers
         * the empty-feed state ("find people to follow") on every size. */}
        {user && (
          <div className="mb-4">
            <PeopleToFollow />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <SegmentedControl
            aria-label={t("home.feedAria")}
            value={tab}
            onValueChange={(value) => setTab(value as "latest" | "following")}
            options={[
              { value: "latest", label: t("home.latest") },
              { value: "following", label: t("home.following") },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Picker
              aria-label={t("feed.languageAria")}
              options={[
                { value: "all", label: t("feed.languageAll") },
                { value: "en", label: t("language.english") },
                { value: "ja", label: t("language.japanese") },
              ]}
              value={language}
              onValueChange={(value) => {
                if (value === "all" || value === "en" || value === "ja") {
                  setLanguage(value);
                }
              }}
              className="w-auto max-w-44"
            />
            <Button asChild variant="outline" size="sm">
              <Link
                to="/groups"
                onMouseEnter={prefetchGroups}
                onFocus={prefetchGroups}
              >
                <UsersIcon aria-hidden />
                {t("home.groups")}
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {tab === "latest" ? (
            <FeedTabContent
              tab="latest"
              language={language}
              emptyTitle={t("home.emptyLatestTitle")}
              emptyDescription={t("home.emptyLatestDescription")}
            />
          ) : user ? (
            <FeedTabContent
              tab="following"
              language={language}
              emptyTitle={t("home.emptyFollowingTitle")}
            />
          ) : (
            <EmptyState
              title={t("home.signInToFollow")}
              action={
                <Button asChild size="sm">
                  <Link to="/login?returnTo=/">{t("common.signIn")}</Link>
                </Button>
              }
            />
          )}
        </div>
      </div>

      <aside className="mt-8 hidden lg:mt-0 lg:block">
        <RightRail signedIn={user !== null} />
      </aside>
    </div>
  );
}

/**
 * Signed-out welcome: the logo, one line about the community, and sign-up
 * and sign-in buttons, right above the public feed. The tools stay one tap
 * away in the nav.
 */
function SignedOutIntro() {
  const t = useT();
  return (
    <section className="mb-4 rounded-md border bg-card p-4">
      <Logo className="text-xl" markClassName="size-7" />
      <p className="mt-2 text-sm text-muted-foreground">
        {t("home.signedOutIntro")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="accent">
          <Link to="/login?tab=signup&returnTo=/">{t("common.signUp")}</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/login?returnTo=/">{t("common.signIn")}</Link>
        </Button>
      </div>
    </section>
  );
}

function RightRail({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="grid gap-4">
      <MyGroupsRail signedIn={signedIn} />
    </div>
  );
}

function MyGroupsRail({ signedIn }: { signedIn: boolean }) {
  const t = useT();
  const myGroups = useMyGroups();
  const groups = myGroups.data ?? [];

  if (!signedIn) {
    return (
      <section
        aria-label={t("home.yourGroups")}
        className="rounded-md border bg-card p-4"
      >
        <h2 className="font-heading text-sm font-semibold">
          {t("home.yourGroups")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("home.signInToJoinGroups")}
        </p>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link to="/login?returnTo=/">{t("common.signIn")}</Link>
        </Button>
      </section>
    );
  }

  return (
    <section
      aria-label={t("home.yourGroups")}
      className="rounded-md border bg-card p-4"
    >
      <h2 className="font-heading text-sm font-semibold">
        {t("home.yourGroups")}
      </h2>
      {myGroups.isPending ? (
        <LoadingArea
          pending={true}
          label={t("groups.loadingGroups")}
          skeleton={<TextLinesSkeleton lines={2} />}
          className="mt-3"
        />
      ) : myGroups.isError ? (
        <ErrorState
          title={t("home.groupsLoadError")}
          description={myGroups.error.message}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void myGroups.refetch()}
            >
              {t("common.retry")}
            </Button>
          }
          className="border-none bg-transparent px-0 py-2"
        />
      ) : groups.length > 0 ? (
        <ul className="mt-2 grid gap-1.5">
          {groups.slice(0, 5).map((group) => (
            <li key={group.id} className="min-w-0">
              <Link
                to={`/g/${group.slug}`}
                className="block truncate text-sm hover:underline"
              >
                {group.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("home.noGroupsYet")}
        </p>
      )}
    </section>
  );
}

interface FeedTabContentProps {
  tab: "latest" | "following";
  language: FeedLanguage;
  emptyTitle: string;
  emptyDescription?: string;
}

function FeedTabContent({
  tab,
  language,
  emptyTitle,
  emptyDescription,
}: FeedTabContentProps) {
  const t = useT();
  const feed = useFeed(tab, language);

  if (feed.isError) {
    return (
      <ErrorState
        title={t("home.feedErrorTitle")}
        description={feed.error.message}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void feed.refetch()}
          >
            {t("common.retry")}
          </Button>
        }
      />
    );
  }

  const posts = feed.data?.pages.flat() ?? [];

  return (
    <LoadingArea
      pending={feed.isPending}
      label={t("home.loadingPosts")}
      skeleton={<PostListSkeleton />}
    >
      <div className="grid gap-3">
        {posts.length === 0 ? (
          // Recording mode fills the empty feed with sample posts instead
          // of an empty state, so recordings show a lively community.
          isDemoMode() ? (
            <DemoPostList />
          ) : (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          )
        ) : (
          <PostList posts={posts} />
        )}
        {feed.hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void feed.fetchNextPage()}
            disabled={feed.isFetchingNextPage}
          >
            {feed.isFetchingNextPage
              ? t("common.loading")
              : t("notifications.loadMore")}
          </Button>
        )}
      </div>
    </LoadingArea>
  );
}
