import { useT } from "@/lib/i18n/t";

/**
 * The screen-reader label for the sheet and dialog icon close buttons. The
 * generated kit hard-codes English "Close", so the label lives here in the
 * shared components, translated per locale (`common.close`).
 */
export function CloseLabel() {
  const t = useT();
  return <span className="sr-only">{t("common.close")}</span>;
}
