import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";

import { SOURCE_NAMES } from "@/features/source-links/sources";
import { track } from "@/lib/telemetry/analytics";
import type { SourceName } from "@/lib/telemetry/events";

/**
 * `/from/:source`: a marketing landing route. A known platform records one
 * `source_visit` event — carrying only the platform name — and an unknown
 * one records nothing; both then land on the home page. The page itself
 * never paints: it redirects in its first effect.
 */
export function SourceRedirectPage() {
  const { source } = useParams<{ source: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (source && SOURCE_NAMES.has(source as SourceName)) {
      track("source_visit", { source: source as SourceName });
    }
    navigate("/", { replace: true });
  }, [source, navigate]);

  return null;
}
