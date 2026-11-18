import { KeyRoundIcon, LoaderCircleIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { validateNewPassword } from "@/lib/auth/validation";
import type { AuthFailure } from "@/lib/auth/types";
import { UnconfiguredNotice } from "@/features/account/unconfigured-notice";

/** The page the password-reset email links to: choose a new password. */
export function ResetPasswordPage() {
  const auth = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<AuthFailure | null>(null);
  const [pending, setPending] = useState(false);

  if (!auth.isConfigured) {
    return (
      <Page title={t("reset.title")} width="narrow">
        <UnconfiguredNotice />
      </Page>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateNewPassword(password);
    setPasswordError(error);
    setConfirmError(null);
    setFormError(null);
    if (error) return;
    if (confirmPassword !== password) {
      setConfirmError(t("reset.mismatch"));
      return;
    }

    setPending(true);
    const result = await auth.updatePassword(password);
    setPending(false);
    if (result.ok) {
      toast.success(t("reset.updatedToast"));
      navigate("/", { replace: true });
    } else if (result.error.field === "password") {
      setPasswordError(result.error.message);
    } else {
      setFormError(result.error);
    }
  };

  return (
    <Page title={t("reset.title")} width="narrow">
      <Card>
        <CardHeader>
          <CardTitle>{t("reset.title")}</CardTitle>
          <CardDescription>{t("reset.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-2">
              <Label htmlFor="new-password">{t("reset.newPassword")}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={passwordError ? true : undefined}
                aria-describedby={
                  passwordError ? "new-password-error" : undefined
                }
              />
              {passwordError ? (
                <p
                  id="new-password-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {passwordError}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">
                {t("reset.confirmPassword")}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={confirmError ? true : undefined}
                aria-describedby={
                  confirmError ? "confirm-password-error" : undefined
                }
              />
              {confirmError ? (
                <p
                  id="confirm-password-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {confirmError}
                </p>
              ) : null}
            </div>
            {formError ? (
              <p
                id="reset-form-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {formError.message}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={pending}
              aria-describedby={formError ? "reset-form-error" : undefined}
            >
              {pending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <KeyRoundIcon />
              )}
              {t("reset.update")}
            </Button>
            <Button
              asChild
              variant="link"
              className="h-auto justify-self-start p-0"
            >
              <Link to="/login">{t("login.backToSignIn")}</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </Page>
  );
}
