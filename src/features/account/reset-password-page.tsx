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
import { validateNewPassword } from "@/lib/auth/validation";
import type { AuthFailure } from "@/lib/auth/types";

/** The page the password-reset email links to: choose a new password. */
export function ResetPasswordPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<AuthFailure | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateNewPassword(password);
    setPasswordError(error);
    setFormError(null);
    if (error) return;
    if (confirmPassword !== password) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPending(true);
    const result = await auth.updatePassword(password);
    setPending(false);
    if (result.ok) {
      toast.success("Password updated.");
      navigate("/", { replace: true });
    } else {
      setFormError(result.error);
    }
  };

  return (
    <Page title="Choose a new password" width="narrow">
      <Card>
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            This sets the password for your account. You stay signed in
            afterwards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={passwordError ? true : undefined}
              />
              {passwordError ? (
                <p className="text-sm text-destructive" role="alert">
                  {passwordError}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError.message}
              </p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <KeyRoundIcon />
              )}
              Update password
            </Button>
            <Button
              asChild
              variant="link"
              className="h-auto justify-self-start p-0"
            >
              <Link to="/login">Back to sign in</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </Page>
  );
}
