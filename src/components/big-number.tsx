import { cn } from "@/lib/utils";

type BigNumberSize = "md" | "lg" | "xl" | "2xl";

const SIZES: Record<BigNumberSize, string> = {
  md: "text-3xl",
  lg: "text-4xl",
  xl: "text-5xl",
  "2xl": "text-6xl",
};

interface BigNumberProps {
  children: React.ReactNode;
  size?: BigNumberSize;
  className?: string;
}

/**
 * The most important number on a screen, set in Barlow with tabular figures
 * so columns of numbers stay aligned.
 */
export function BigNumber({
  children,
  size = "lg",
  className,
}: BigNumberProps) {
  return (
    <span
      className={cn(
        "font-heading font-semibold tabular-nums tracking-tight",
        SIZES[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
