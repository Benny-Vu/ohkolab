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
import type { AuthFailure } from "@/lib/auth/types";

/**
 * Finishes an OAuth, email-confirmation or password-reset redirect, then
 * sends the user on their way. The redirect runs exactly once per mount.
 */
export function AuthCallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let active = true;
    auth
      .completeAuthRedirect(window.location.href)
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          navigate(result.data.returnTo, { replace: true });
        } else {
          setFailure(result.error);
        }
      })
      .catch(() => {
        if (active)
          setFailure({
            code: "unknown",
            message: "Something went wrong. Try again.",
          });
      });
    return () => {
      active = false;
    };
  }, [auth, navigate]);

  return (
    <Page title="Finishing sign-in…" width="narrow">
      <Card>
        <CardHeader>
          <CardTitle>
            {failure ? "Sign-in could not be completed" : "Finishing sign-in…"}
          </CardTitle>
          <CardDescription>
            {failure
              ? failure.message
              : "One moment while your sign-in is completed."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {failure ? (
            <Button asChild>
              <Link to="/login">Back to sign in</Link>
            </Button>
          ) : (
            <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" />
          )}
        </CardContent>
      </Card>
    </Page>
  );
}
