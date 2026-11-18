import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { isExpectedError, reportError } from "@/lib/telemetry/sentry";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (!isExpectedError(error)) reportError(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (!isExpectedError(error)) reportError(error);
    },
  }),
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

/** App-wide context: server-state cache, auth, tooltips, toasts. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster
            position="bottom-right"
            duration={3000}
            mobileOffset={{
              bottom: "calc(56px + env(safe-area-inset-bottom))",
            }}
          />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
