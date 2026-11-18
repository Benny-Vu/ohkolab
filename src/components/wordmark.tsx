import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
}

/**
 * App wordmark: "OHKO" in bold plus "Lab" in medium muted, set in Barlow
 * Semi Condensed.
 */
export function Wordmark({ className }: WordmarkProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-heading text-lg leading-none tracking-tight",
        className,
      )}
    >
      <span className="font-bold">OHKO</span>
      <span className="font-medium text-muted-foreground">Lab</span>
    </span>
  );
}
