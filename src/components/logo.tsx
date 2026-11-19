import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/wordmark";

interface LogoMarkProps {
  className?: string;
}

/**
 * Logo mark: a struck target on the accent tile — one hit, knocked out.
 * Geometric only, no Pokémon shapes or trademarks, token-coloured so it
 * follows the theme. `public/favicon.svg` is the standalone twin with the
 * same geometry in fixed colours.
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-6 shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7" className="fill-accent-brand" />
      <circle
        cx="16"
        cy="16"
        r="7"
        fill="none"
        strokeWidth="3.2"
        className="stroke-accent-brand-foreground"
      />
      <line
        x1="8.8"
        y1="23.2"
        x2="23.2"
        y2="8.8"
        strokeWidth="3.2"
        strokeLinecap="round"
        className="stroke-accent-brand-foreground"
      />
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
