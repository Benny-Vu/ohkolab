import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while the first page's code is loading. The 404 and route error
 * pages live in `@/features/system` and are mounted from `systemRoutes`.
 */
export function PageLoading() {
  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6"
      aria-busy="true"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Button asChild variant="link" className="h-auto p-0">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
