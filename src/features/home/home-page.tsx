import { Suspense, lazy, useState } from "react";
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
import { SegmentedControl } from "@/components/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/use-auth";
import { useMyGroups } from "@/lib/groups/queries";
import { socialAvailability } from "@/lib/social/availability";
import { useFeed } from "@/lib/social/queries";
import { Composer } from "@/features/feed/composer";
import { PostList } from "@/features/feed/post-list";

const TrendingStrip = lazy(() =>
  import("@/features/home/trending-strip").then((module) => ({
    default: module.TrendingStrip,
  })),
);

interface Tool {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const TOOLS: Tool[] = [
  {
    to: "/calc",
    title: "Damage calculator",
    description: "Check damage ranges and KO chances with Champions mechanics.",
    icon: CalculatorIcon,
  },
  {
    to: "/teams",
    title: "Team builder",
    description: "Build a team of six, check its type coverage and export it.",
    icon: SwordsIcon,
  },
  {
    to: "/meta",
    title: "Metagame",
    description: "Usage, common sets and speed tiers for singles and doubles.",
    icon: ChartColumnIcon,
  },
];

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
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="text-primary">OHKO</span>Lab
      </h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Tools and community for Pokémon Champions: calculate damage, build teams
        and follow the metagame.
      </p>

      <ul className="mt-8 grid gap-3">
        {TOOLS.map((tool) => (
          <li key={tool.to}>
            <Link
              to={tool.to}
              className="block rounded-lg focus-visible:outline-2"
            >
              <div className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors duration-150 ease-out hover:bg-surface-sunken">
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
        OHKOLab is an unofficial fan project, not affiliated with Nintendo, Game
        Freak, Creatures or The Pokémon Company.
      </p>
    </div>
  );
}

function FeedHome() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"latest" | "following">("latest");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
      <div className="min-w-0">
        {!user && <SignedOutIntro />}

        {user && (
          <div className="mb-4">
            <Composer />
          </div>
        )}

        <Suspense fallback={null}>
          <div className="mb-4 lg:hidden">
            <TrendingStrip />
          </div>
        </Suspense>

        <div className="flex items-center justify-between gap-2">
          <SegmentedControl
            aria-label="Feed"
            value={tab}
            onValueChange={(value) => setTab(value as "latest" | "following")}
            options={[
              { value: "latest", label: "Latest" },
              { value: "following", label: "Following" },
            ]}
          />
          <Button asChild variant="outline" size="sm">
            <Link to="/groups">
              <UsersIcon aria-hidden />
              Groups
            </Link>
          </Button>
        </div>

        <div className="mt-4">
          {tab === "latest" ? (
            <FeedTabContent
              tab="latest"
              emptyTitle="No posts yet"
              emptyDescription="Be the first to post."
            />
          ) : user ? (
            <FeedTabContent
              tab="following"
              emptyTitle="No posts from people you follow yet"
            />
          ) : (
            <EmptyState
              title="Sign in to see posts from trainers you follow"
              action={
                <Button asChild size="sm">
                  <Link to="/login?returnTo=/">Sign in</Link>
                </Button>
              }
            />
          )}
        </div>
      </div>

      <aside className="mt-8 hidden lg:mt-0 lg:block">
        <RightRail />
      </aside>
    </div>
  );
}

function SignedOutIntro() {
  return (
    <section className="mb-4 rounded-lg border bg-card p-4">
      <h1 className="font-heading text-xl font-bold">
        <span className="text-primary">OHKO</span>Lab
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A community for Pokémon Champions players. Share teams, talk strategy
        and follow the trainers you rate.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to="/calc">
            Damage calculator
            <ArrowRightIcon aria-hidden />
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/meta">Metagame</Link>
        </Button>
      </div>
    </section>
  );
}

function RightRail() {
  return (
    <div className="grid gap-4">
      <Suspense fallback={null}>
        <TrendingStrip />
      </Suspense>
      <MyGroupsRail />
    </div>
  );
}

function MyGroupsRail() {
  const myGroups = useMyGroups();
  const groups = myGroups.data ?? [];

  return (
    <section
      aria-label="Your groups"
      className="rounded-lg border bg-card p-4"
    >
      <h2 className="font-heading text-sm font-semibold">Your groups</h2>
      {groups.length > 0 ? (
        <ul className="mt-2 grid gap-1.5">
          {groups.slice(0, 5).map((group) => (
            <li key={group.id}>
              <Link
                to={`/groups/${group.slug}`}
                className="text-sm hover:underline"
              >
                {group.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No groups yet</p>
      )}
    </section>
  );
}

interface FeedTabContentProps {
  tab: "latest" | "following";
  emptyTitle: string;
  emptyDescription?: string;
}

function FeedTabContent({
  tab,
  emptyTitle,
  emptyDescription,
}: FeedTabContentProps) {
  const feed = useFeed(tab);

  if (feed.isPending) {
    return (
      <div className="grid gap-3" aria-label="Loading posts">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    );
  }

  if (feed.isError) {
    return (
      <ErrorState
        title="Could not load the feed"
        description={feed.error.message}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void feed.refetch()}
          >
            Try again
          </Button>
        }
      />
    );
  }

  const posts = feed.data?.pages.flat() ?? [];

  return (
    <div className="grid gap-3">
      {posts.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <PostList posts={posts} />
      )}
      {feed.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
        >
          {feed.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
