import { useState } from "react";
import { Link, NavLink } from "react-router";
import { LogInIcon, LogOutIcon, MessageSquareIcon } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/user-avatar";
import { menuItemClass } from "@/components/menu-item-class";
import { iconHitClass } from "@/components/touch-targets";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeedbackDialog } from "@/features/feedback/feedback-dialog";
import { useAuth } from "@/lib/auth";
import { useIsModerator } from "@/lib/social/moderator-status";
import { useT } from "@/lib/i18n/t";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { tabLabelSizeClass } from "@/app/nav-items";

interface AccountMenuProps {
  /** "header" for the desktop header, "tab" for the phone tab bar. */
  variant: "header" | "tab";
}

/** Account entry for the header and the phone tab bar. */
export function AccountMenu({ variant }: AccountMenuProps) {
  const auth = useAuth();
  const t = useT();
  const [locale] = useLocale();
  const moderator = useIsModerator();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  async function handleSignOut() {
    const result = await auth.signOut();
    if (result.ok) {
      toast.success(t("profile.signedOutToast"));
    } else {
      toast.error(result.error.message);
    }
  }

  if (auth.loading) {
    return variant === "header" ? (
      <span aria-hidden className="grid size-8 place-content-center">
        <span className="size-6 animate-pulse rounded-md bg-muted" />
      </span>
    ) : (
      <span
        aria-hidden
        className="flex h-full flex-col items-center justify-center gap-0.5"
      >
        <span className="size-5 animate-pulse rounded-full bg-muted" />
        <span className="h-2.5 w-8 animate-pulse rounded bg-muted" />
      </span>
    );
  }

  if (!auth.user) {
    if (variant === "header") {
      return (
        <Button variant="ghost" asChild>
          <Link to="/login">
            <LogInIcon aria-hidden />
            {t("common.signIn")}
          </Link>
        </Button>
      );
    }
    return (
      <NavLink
        to="/login"
        className={({ isActive }) =>
          cn(
            "flex h-full flex-col items-center justify-center gap-0.5 font-medium text-muted-foreground",
            tabLabelSizeClass(locale),
            isActive && "text-primary",
          )
        }
      >
        <LogInIcon aria-hidden className="size-5" />
        {t("common.signIn")}
      </NavLink>
    );
  }

  const profile = auth.profile;

  return (
    <>
      <DropdownMenu>
        {variant === "header" ? (
          <DropdownMenuTrigger asChild>
            {/* The avatar is round, so its hover background and focus ring
                are round too (rounded-full over the kit's rounded-md). */}
            <Button
              variant="ghost"
              size="icon"
              className={cn("rounded-full", iconHitClass)}
              aria-label={t("account.menuAria")}
            >
              <UserAvatar
                username={profile?.username ?? ""}
                displayName={profile?.displayName ?? null}
                avatarSpecies={profile?.avatarSpecies ?? null}
                size="sm"
              />
            </Button>
          </DropdownMenuTrigger>
        ) : (
          <DropdownMenuTrigger
            aria-label={t("account.menuAria")}
            className={cn(
              "flex h-full min-w-0 flex-col items-center justify-center gap-0.5 font-medium text-muted-foreground hover:text-foreground aria-expanded:text-primary",
              tabLabelSizeClass(locale),
            )}
          >
            <UserAvatar
              username={profile?.username ?? ""}
              displayName={profile?.displayName ?? null}
              avatarSpecies={profile?.avatarSpecies ?? null}
              size="sm"
            />
            <span className="max-w-full truncate">{t("nav.profile")}</span>
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent
          align="end"
          side={variant === "tab" ? "top" : undefined}
          className="w-56"
        >
          <DropdownMenuLabel className="truncate">
            {profile
              ? (profile.displayName ?? profile.username)
              : t("profile.accountSection")}
          </DropdownMenuLabel>
          {profile && (
            <DropdownMenuItem asChild className={menuItemClass}>
              <Link to={`/u/${profile.username}`}>
                {t("profile.publicPage")}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/profile">{t("nav.profile")}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/groups">{t("groups.homeTitle")}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className={menuItemClass}
            onSelect={() => setFeedbackOpen(true)}
          >
            <MessageSquareIcon aria-hidden />
            {t("footer.sendFeedback")}
          </DropdownMenuItem>
          {moderator.data === true && (
            <>
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link to="/admin/reports">{t("pageTitle.reports")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link to="/admin/appeals">{t("account.moderationItem")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link to="/admin/feedback">{t("pageTitle.feedback")}</Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={menuItemClass}
            onSelect={() => {
              void handleSignOut();
            }}
          >
            <LogOutIcon aria-hidden />
            {t("common.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
