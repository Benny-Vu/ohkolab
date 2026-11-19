import { lazy, Suspense, useState } from "react";
import { Link, NavLink, Outlet, ScrollRestoration } from "react-router";

import { AccountMenu } from "@/app/account-menu";
import { NAV_ITEMS } from "@/app/nav-items";
import { usePageTitle, usePageView } from "@/app/page-title";
import { SearchPalette } from "@/app/search-palette";
import { useNativeApp } from "@/app/use-native-app";
import { LanguageSwitch } from "@/components/language-switch";
import { Logo } from "@/components/logo";
import { OfflineNotice } from "@/components/offline-notice";
// The birth date prompt only exists while VITE_DIRECT_MESSAGES is on; it
// loads lazily so flag-off builds never download it.
const BirthDatePrompt = lazy(() =>
  import("@/features/account/birth-date-fields").then((m) => ({
    default: m.BirthDatePrompt,
  })),
);
// The Messages nav unread badge: same lazy, flag-gated mount. The nav item
// itself is a plain entry in NAV_ITEMS; this is the only live part.
const MessagesNavBadge = lazy(() =>
  import("@/features/messages/nav-unread-badge").then((m) => ({
    default: m.MessagesNavBadge,
  })),
);
import { OnboardingDialog } from "@/features/account/onboarding-dialog";
import { FeedbackDialog } from "@/features/feedback/feedback-dialog";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { useT } from "@/lib/i18n/t";
import { directMessagesEnabled } from "@/lib/messages/flag";
import { cn } from "@/lib/utils";

/** App frame: desktop header, page content, phone top bar and tab bar. */
export function AppLayout() {
  usePageTitle();
  usePageView();
  // Native app glue (back button, status bar, splash, external links); no-op on the web.
  useNativeApp();
  const t = useT();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 pt-safe backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" aria-label={t("nav.homeAria")} viewTransition>
            <Logo />
          </Link>
          <nav
            aria-label={t("nav.main")}
            className="hidden items-center gap-1 md:flex"
          >
            {NAV_ITEMS.filter((item) => item.to !== "/profile").map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                viewTransition
                className={({ isActive }) =>
                  cn(
                    "relative px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-(--motion-fast) ease-(--motion-ease-out) outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                    isActive &&
                      "text-foreground after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:bg-accent-brand-text",
                  )
                }
              >
                {t(item.labelKey)}
                {item.badge === "messages" && directMessagesEnabled() ? (
                  <Suspense fallback={null}>
                    <MessagesNavBadge />
                  </Suspense>
                ) : null}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <SearchPalette />
            <NotificationBell />
            <AccountMenu variant="header" />
          </div>
        </div>
        {/* Native apps only: a thin "You're offline" overlay under the
            header. Renders nothing on the web or while online. */}
        <OfflineNotice />
      </header>

      {/* The phone tab bar is 56px plus the gesture-navigation inset. */}
      {/* tabIndex -1 lets deleted rows park focus on the page landmark. */}
      <main
        tabIndex={-1}
        className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] outline-none md:pb-0"
      >
        <Outlet />
      </main>

      <footer className="border-t px-6 pt-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground md:pb-4">
        <Logo className="mb-3 justify-center" markClassName="size-5" />
        <p>{t("footer.disclaimer")}</p>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link
            className="underline-offset-4 hover:underline"
            to="/terms"
            viewTransition
          >
            {t("footer.terms")}
          </Link>
          <Link
            className="underline-offset-4 hover:underline"
            to="/privacy"
            viewTransition
          >
            {t("footer.privacy")}
          </Link>
          <Link
            className="underline-offset-4 hover:underline"
            to="/credits"
            viewTransition
          >
            {t("footer.credits")}
          </Link>
          <button
            type="button"
            className="underline-offset-4 hover:underline"
            onClick={() => setFeedbackOpen(true)}
          >
            {t("footer.sendFeedback")}
          </button>
        </p>
        <p className="mt-2">
          {t("footer.madeBy")}{" "}
          <a
            className="font-medium underline-offset-4 hover:underline"
            href="https://github.com/vu-forge"
            rel="noreferrer"
            target="_blank"
          >
            Vu Forge
          </a>
        </p>
        <div className="mt-3 flex justify-center">
          <LanguageSwitch />
        </div>
      </footer>

      <nav
        aria-label={t("nav.main")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-safe backdrop-blur md:hidden"
      >
        <ul
          className={cn(
            "mx-auto grid h-14 max-w-md",
            // One more tab while the direct messages flag is on.
            directMessagesEnabled() ? "grid-cols-6" : "grid-cols-5",
          )}
        >
          {NAV_ITEMS.filter((item) => item.to !== "/profile").map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                viewTransition
                className={({ isActive }) =>
                  cn(
                    "relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground",
                    isActive &&
                      "text-foreground before:absolute before:top-0 before:h-0.5 before:w-8 before:bg-accent-brand-text",
                  )
                }
              >
                <item.icon className="size-5" aria-hidden />
                {t(item.labelKey)}
                {item.badge === "messages" && directMessagesEnabled() ? (
                  <Suspense fallback={null}>
                    <MessagesNavBadge />
                  </Suspense>
                ) : null}
              </NavLink>
            </li>
          ))}
          <li>
            <AccountMenu variant="tab" />
          </li>
        </ul>
      </nav>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <OnboardingDialog />
      {directMessagesEnabled() ? (
        <Suspense fallback={null}>
          <BirthDatePrompt />
        </Suspense>
      ) : null}
      <ScrollRestoration />
    </div>
  );
}
