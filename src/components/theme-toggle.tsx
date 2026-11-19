import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/t";
import { track } from "@/lib/telemetry/analytics";
import { useTheme } from "@/lib/theme";

/** Switches between the dark and light themes. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const t = useT();
  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? t("theme.toLight") : t("theme.toDark")}
      onClick={() => {
        const next = isDark ? "light" : "dark";
        setTheme(next);
        track("theme_changed", { theme: next });
      }}
    >
      {isDark ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
    </Button>
  );
}
