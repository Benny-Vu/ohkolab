import { Link } from "react-router";

import { HomeIcon } from "lucide-react";

import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { buttonTouchClass } from "@/components/touch-targets";
import { useT } from "@/lib/i18n/t";

/**
 * Shown for any URL no route matches. Mounted by the lead from
 * `systemRoutes` (or imported directly as `NotFoundPage`).
 */
export function NotFoundPage() {
  const t = useT();
  return (
    <Page title={t("system.notFoundTitle")} width="narrow">
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <p className="font-heading text-6xl font-semibold tabular-nums tracking-tight text-muted-foreground">
          404
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("system.notFoundBody")}
        </p>
        <Button asChild className={buttonTouchClass}>
          <Link to="/">
            <HomeIcon className="size-4" />
            {t("authCallback.backHome")}
          </Link>
        </Button>
      </div>
    </Page>
  );
}
