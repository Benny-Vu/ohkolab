import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/wordmark";

interface LogoMarkProps {
  className?: string;
}

/**
 * Logo mark: the split O — a ring split by a diagonal bar, drawn on its own,
 * no tile (owner's pick, 2026-11-20). Geometric only, no Pokémon shapes or
 * trademarks. The stroke follows the theme through the accent-text token:
 * lime on dark, olive on light. `public/favicon.svg` is the standalone twin
 * in fixed colours (ink mark on a lime tile).
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("size-6 shrink-0 text-accent-brand-text", className)}
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="butt"
      >
        <path d="M77 37A31 31 0 0 1 37 77M23 63A31 31 0 0 1 63 23" />
        <path d="M69 31 31 69" />
      </g>
    </svg>
  );
}

interface LogoProps {
  className?: string;
  markClassName?: string;
}

/** Mark plus wordmark, as used in the header, footer and sign-in screen. */
export function Logo({ className, markClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <Wordmark />
    </span>
  );
}
