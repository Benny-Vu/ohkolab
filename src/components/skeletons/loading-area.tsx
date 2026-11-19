import type { ReactNode } from "react";

import { useDelayedPending } from "@/components/skeletons/use-delayed-pending";
import { cn } from "@/lib/utils";

/**
 * The entrance real content plays when it replaces a skeleton (or mounts
 * fresh): a plain opacity fade on the motion base token. Only opacity is
 * animated, and `prefers-reduced-motion` turns it off globally.
 */
export const CONTENT_FADE_IN =
  "animate-in fade-in duration-(--motion-base) ease-(--motion-ease-out)";

interface LoadingAreaProps {
  /** True while the content is loading. */
  pending: boolean;
  /** The accessible name of the loading state, e.g. "Loading posts". */
  label: string;
  /** Skeleton content shaped like the real content; carries its own layout. */
  skeleton: ReactNode;
  /** The real content. Rendered only once `pending` is false. */
  children?: ReactNode;
  /** Optional classes for the wrapper element in every state. */
  className?: string;
  /** Override the anti-flash delay (default 150 ms). */
  delayMs?: number;
}

/**
 * One loading branch: nothing in the DOM for the first ~150 ms of a load,
 * then a labelled skeleton shaped like the content, then the content fading
 * in over the motion base duration. Error states stay with the caller.
 *
 * `pending` may be hardcoded true for early-return branches that never
 * render this instance with children (page-level skeletons).
 */
export function LoadingArea({
  pending,
  label,
  skeleton,
  children,
  className,
  delayMs,
}: LoadingAreaProps) {
  const showSkeleton = useDelayedPending(pending, delayMs);

  if (pending) {
    if (!showSkeleton) {
      return <div className={className} aria-busy="true" />;
    }
    return (
      <div
        className={className}
        role="status"
        aria-label={label}
        aria-busy="true"
      >
        {skeleton}
      </div>
    );
  }

  if (!children) {
    return null;
  }

  return <div className={cn(CONTENT_FADE_IN, className)}>{children}</div>;
}
