import { Link } from "react-router";

import { HomeIcon } from "lucide-react";

import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";

/**
 * Shown for any URL no route matches. Mounted by the lead from
 * `systemRoutes` (or imported directly as `NotFoundPage`).
 */
export function NotFoundPage() {
  return (
    <Page title="Page not found" width="narrow">
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <p className="font-heading text-6xl font-semibold tabular-nums tracking-tight text-muted-foreground">
          404
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          There is nothing at this address. It may have moved or never existed.
        </p>
        <Button asChild>
          <Link to="/">
            <HomeIcon className="size-4" />
            Back to home
          </Link>
        </Button>
      </div>
    </Page>
  );
}
