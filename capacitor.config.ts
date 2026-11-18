import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor wraps the built web app (`dist`) in a native Android shell.
 * The `https` scheme keeps the app's origin at `https://localhost`, so the
 * web app behaves exactly as it does on ohkolab.com — cookies, storage and
 * CORS all treat it as a secure origin.
 */
const config: CapacitorConfig = {
  appId: "com.vuforge.ohkolab",
  appName: "OHKOLab",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
