import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageProps {
  title: string;
  description?: string;
  /** Controls shown on the right of the title (buttons, toggles). */
  actions?: ReactNode;
  /** "wide" for tools that use the full width, "narrow" for reading columns. */
  width?: "wide" | "narrow";
  className?: string;
  children: ReactNode;
}

/** Standard page frame: title row plus content, sized for phone first. */
export function Page({
  title,
  description,
  actions,
  width = "wide",
  className,
  children,
}: PageProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-4 sm:px-6 sm:py-6",
        width === "wide" ? "max-w-7xl" : "max-w-2xl",
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </header>
      {children}
    </div>
  );
}
