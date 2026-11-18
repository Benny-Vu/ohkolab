import { LoaderCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";

import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import type { AuthFailure } from "@/lib/auth/types";
import {
  clearNativeAuthFailure,
  readNativeAuthFailure,
} from "@/lib/auth/native-auth";
import { UnconfiguredNotice } from "@/features/account/unconfigured-notice";

/**
 * Finishes an OAuth, email-confirmation or password-reset redirect, then
 * sends the user on their way. The redirect runs exactly once per mount.
 * In the native app the deep-link listener finishes the exchange itself and
 * only forwards failures here, through the stash this page reads first.
 */
export function AuthCallbackPage() {
  const auth = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const started = useRef(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);

  useEffect(() => {
    if (started.current || !auth.isConfigured) return;
    started.current = true;
    let active = true;
    // In the native app the deep-link listener exchanges the code itself
    // and only forwards failures here, through the session stash. Reading
    // it off the synchronous effect path keeps React's cascading-render
    // rule happy; when a failure was stashed, the redirect must not run
    // again (it would report "link invalid" over the real reason).
    void Promise.resolve()
      .then(() => {
        if (!active) return null;
        const stored = readNativeAuthFailure();
        if (stored) clearNativeAuthFailure();
        return stored;
      })
      .then((nativeFailure) => {
        if (!active) return;
        if (nativeFailure) {
          setFailure(nativeFailure);
          return;
        }
        return auth
          .completeAuthRedirect(window.location.href)
          .then((result) => {
            if (!active) return;
            if (result.ok) {
              navigate(result.data.returnTo, { replace: true });
            } else {
              setFailure(result.error);
            }
          });
      })
      .catch(() => {
        if (active)
          setFailure({
            code: "unknown",
            message: t("auth.errUnknown"),
          });
      });
    return () => {
      active = false;
    };
  }, [auth, navigate, t]);

  if (!auth.isConfigured) {
    return (
      <Page title={t("authCallback.finishing")} width="narrow">
        <UnconfiguredNotice />
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">{t("authCallback.backHome")}</Link>
        </Button>
      </Page>
    );
  }

  return (
    <Page title={t("authCallback.finishing")} width="narrow">
      <Card>
        <CardHeader>
          <CardTitle>
            {failure
              ? t("authCallback.failedTitle")
              : t("authCallback.finishing")}
          </CardTitle>
          <CardDescription>
            {failure ? (
              <span role="alert">{failure.message}</span>
            ) : (
              t("authCallback.waitDescription")
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {failure ? (
            <Button asChild>
              <Link to="/login">{t("login.backToSignIn")}</Link>
            </Button>
          ) : (
            <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" />
          )}
        </CardContent>
      </Card>
    </Page>
  );
}
