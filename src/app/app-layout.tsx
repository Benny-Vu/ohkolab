import { Link, NavLink, Outlet, ScrollRestoration } from "react-router";

import { AccountMenu } from "@/app/account-menu";
import { NAV_ITEMS } from "@/app/nav-items";
import { usePageTitle } from "@/app/page-title";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { cn } from "@/lib/utils";

function Wordmark() {
  return (
    <Link
      to="/"
      className="text-lg font-bold tracking-tight"
      aria-label="OHKOLab home"
    >
      <span className="text-primary">OHKO</span>Lab
    </Link>
  );
}

/** App frame: header with desktop navigation, page content, phone tab bar. */
export function AppLayout() {
  usePageTitle();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 pt-safe backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Wordmark />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    isActive && "bg-accent text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
            <AccountMenu variant="header" />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-16 md:pb-0">
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
                    "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground",
                    isActive && "text-primary",
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

      <ScrollRestoration />
    </div>
  );
}
