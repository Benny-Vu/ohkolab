import { Skeleton } from "@/components/ui/skeleton";

/**
 * A generic page frame, mirroring `Page` with a heading and content blocks.
 * Lives in its own module (not `skeletons.tsx`) because `PageLoading` renders
 * it from the entry chunk: keeping it apart keeps every page-shaped skeleton
 * out of the startup bundle. The rest re-export it for the feature pages.
 */
export function PageSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}
