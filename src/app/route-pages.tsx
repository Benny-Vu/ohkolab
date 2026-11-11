import { Link, isRouteErrorResponse, useRouteError } from "react-router";

import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Shown for any URL no route matches. */
export function NotFoundPage() {
  return (
    <Page title="Page not found" width="narrow">
      <p className="mb-4 text-sm text-muted-foreground">
        There is nothing at this address. It may have moved or never existed.
      </p>
      <Button asChild>
        <Link to="/">Back to home</Link>
      </Button>
    </Page>
  );
}

/** Shown when a page fails to load or throws while rendering. */
export function RouteError() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown error";
  return (
    <Page title="Something went wrong" width="narrow">
      <p className="mb-2 text-sm text-muted-foreground">
        This page hit an error. Reloading usually fixes it.
      </p>
      <pre className="mb-4 overflow-x-auto rounded-md bg-muted p-3 text-xs">
        {detail}
      </pre>
      <Button onClick={() => window.location.reload()}>Reload</Button>
    </Page>
  );
}

/** Shown while the first page's code is loading. */
export function PageLoading() {
  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6"
      aria-busy="true"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
