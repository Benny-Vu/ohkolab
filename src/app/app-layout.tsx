import { useState } from "react";
import { Link, NavLink, Outlet, ScrollRestoration } from "react-router";

import { AccountMenu } from "@/app/account-menu";
import { NAV_ITEMS } from "@/app/nav-items";
import { usePageTitle, usePageView } from "@/app/page-title";
import { SearchPalette } from "@/app/search-palette";
import { Wordmark } from "@/components/wordmark";
import { FeedbackDialog } from "@/features/feedback/feedback-dialog";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { cn } from "@/lib/utils";

/** App frame: desktop header, page content, phone top bar and tab bar. */
export function AppLayout() {
  usePageTitle();
  usePageView();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 pt-safe backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" aria-label="OHKOLab home">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.filter((item) => item.to !== "/profile").map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "relative px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                    isActive &&
                      "text-foreground after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:bg-accent-brand",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <SearchPalette />
            <NotificationBell />
            <AccountMenu variant="header" />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-14 md:pb-0">
        <Outlet />
      </main>

      <footer className="border-t px-6 pt-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground md:pb-4">
        <p>
          OHKOLab is an unofficial fan project, not affiliated with Nintendo,
          Game Freak, Creatures or The Pokémon Company.
        </p>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link className="underline-offset-4 hover:underline" to="/terms">
            Terms
          </Link>
          <Link className="underline-offset-4 hover:underline" to="/privacy">
            Privacy
          </Link>
          <button
            type="button"
            className="underline-offset-4 hover:underline"
            onClick={() => setFeedbackOpen(true)}
          >
            Send feedback
          </button>
        </p>
        <p className="mt-2">
          OHKOLab is made by <span className="font-medium">Vu Forge</span>
        </p>
      </footer>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-safe backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid h-14 max-w-md grid-cols-5">
          {NAV_ITEMS.filter((item) => item.to !== "/profile").map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground",
                    isActive &&
                      "text-foreground before:absolute before:top-0 before:h-0.5 before:w-8 before:bg-accent-brand",
                  )
                }
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </NavLink>
            </li>
          ))}
          <li>
            <AccountMenu variant="tab" />
          </li>
        </ul>
      </nav>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <ScrollRestoration />
    </div>
  );
}
