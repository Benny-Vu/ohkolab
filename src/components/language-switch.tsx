import { SegmentedControl } from "@/components/segmented-control";
import { useLocale, type Locale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";

/**
 * English / 日本語. Shown in the footer (signed out included) and in
 * profile settings. Switching sets <html lang>, so the Japanese system
 * fonts take over, and the choice persists in local storage.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const [locale, setLocale] = useLocale();
  const t = useT();

  return (
    <SegmentedControl
      aria-label={t("language.label")}
      className={className}
      value={locale}
      onValueChange={(value) => setLocale(value as Locale)}
      options={[
        { value: "en", label: t("language.english") },
        { value: "ja", label: t("language.japanese") },
      ]}
    />
  );
}
