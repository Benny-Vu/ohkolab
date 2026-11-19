import { describe, expect, it } from "vitest";

import { setLocale } from "@/lib/i18n/locale";
import { loadJapaneseDictionary, japaneseTemplate } from "@/lib/i18n/ja-loader";
import { t } from "@/lib/i18n/t";

describe("Japanese dictionary loader", () => {
  it("serves the Japanese template once loaded", async () => {
    await loadJapaneseDictionary();
    expect(japaneseTemplate("nav.home")).toBe("ホーム");
  });

  it("is idempotent: loading again resolves without refetching", async () => {
    const first = loadJapaneseDictionary();
    const second = loadJapaneseDictionary();
    expect(first).toBe(second);
    await first;
  });

  it("translates through t() in the active ja locale", () => {
    setLocale("ja");
    expect(t("nav.home")).toBe("ホーム");
    setLocale("en");
    expect(t("nav.home")).toBe("Home");
  });
});
