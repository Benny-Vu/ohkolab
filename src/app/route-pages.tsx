import { Link } from "react-router";

import { Button } from "@/components/ui/button";
// Deep imports, not the barrel: route-pages sits in the entry chunk, and the
// barrel would pull every page skeleton into the startup bundle (the
// entry-size guard in CI enforces this).
import { LoadingArea } from "@/components/skeletons/loading-area";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { useT } from "@/lib/i18n/t";

/**
 * Shown while the first page's code is loading: a labelled, page-shaped
 * skeleton after the anti-flash delay, with a way back home. The 404 and
 * route error pages live in `@/features/system` and are mounted from
 * `systemRoutes`.
 */
export function PageLoading() {
  const t = useT();
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      <LoadingArea
        pending={true}
        label={t("common.loading")}
        skeleton={<PageSkeleton />}
      />
      <Button asChild variant="link" className="h-auto p-0">
        <Link to="/">{t("common.backToHome")}</Link>
      </Button>
    </div>
  );
}
