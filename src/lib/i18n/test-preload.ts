/**
 * Registers every English feature domain on the CURRENT instances of the
 * i18n modules — the ones a `vi.resetModules()` plus dynamic re-import just
 * created. Tests that reset modules and re-import pages call this next, so
 * the fresh loader sees the full dictionary again, exactly like the
 * production route loaders do. The imports are dynamic on purpose: they
 * resolve through the fresh module registry.
 */
export async function preloadEnglishDomains(): Promise<void> {
  const [enLoader, community, account, tools, learn] = await Promise.all([
    import("@/lib/i18n/en-loader"),
    import("@/lib/i18n/entries/community"),
    import("@/lib/i18n/entries/account"),
    import("@/lib/i18n/entries/tools"),
    import("@/lib/i18n/entries/learn"),
  ]);
  enLoader.registerEnglishDomain("community", community.communityEn);
  enLoader.registerEnglishDomain("account", account.accountEn);
  enLoader.registerEnglishDomain("tools", tools.toolsEn);
  enLoader.registerEnglishDomain("learn", learn.learnEn);
}
