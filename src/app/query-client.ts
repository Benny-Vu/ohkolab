import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { isExpectedError, reportError } from "@/lib/telemetry/sentry";

/**
 * The shared query client, in its own module so component files keep
 * exporting only components (react-refresh). The nav prefetch
 * (src/lib/prefetch.ts) and the providers both use it.
 */
export const queryClient = new QueryClient({
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
