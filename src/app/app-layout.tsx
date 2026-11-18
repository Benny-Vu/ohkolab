import { useState } from "react";
import { Link, NavLink, Outlet, ScrollRestoration } from "react-router";

import { AccountMenu } from "@/app/account-menu";
import { NAV_ITEMS } from "@/app/nav-items";
import { usePageTitle, usePageView } from "@/app/page-title";
import { SearchPalette } from "@/app/search-palette";
import { useNativeApp } from "@/app/use-native-app";
import { LanguageSwitch } from "@/components/language-switch";
import { Wordmark } from "@/components/wordmark";
import { OnboardingDialog } from "@/features/account/onboarding-dialog";
import { FeedbackDialog } from "@/features/feedback/feedback-dialog";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { useT } from "@/lib/i18n/t";
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
          <Link to="/" aria-label="OHKOLab home">
            <Wordmark />
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
                className={({ isActive }) =>
                  cn(
                    "relative px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                    isActive &&
                      "text-foreground after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:bg-accent-brand-text",
                  )
                }
              >
                {t(item.labelKey)}
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

      {/* The phone tab bar is 56px plus the gesture-navigation inset. */}
      <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      <footer className="border-t px-6 pt-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground md:pb-4">
        <p>{t("footer.disclaimer")}</p>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link className="underline-offset-4 hover:underline" to="/terms">
            {t("footer.terms")}
          </Link>
          <Link className="underline-offset-4 hover:underline" to="/privacy">
            {t("footer.privacy")}
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
        <p className="mt-2">{t("footer.japaneseNames")}</p>
        <div className="mt-3 flex justify-center">
          <LanguageSwitch />
        </div>
      </footer>

      <nav
        aria-label={t("nav.main")}
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
                      "text-foreground before:absolute before:top-0 before:h-0.5 before:w-8 before:bg-accent-brand-text",
                  )
                }
              >
                <item.icon className="size-5" aria-hidden />
                {t(item.labelKey)}
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
      <ScrollRestoration />
    </div>
  );
}
