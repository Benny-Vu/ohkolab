import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import "@/index.css";
import { Providers } from "@/app/providers";
import { router } from "@/app/router";
import { initLocale } from "@/lib/i18n/locale";
import { initSentry } from "@/lib/telemetry/sentry";

initSentry();
// Mirrors the active locale onto <html lang> before the first paint.
initLocale();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
