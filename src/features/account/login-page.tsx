import { LoaderCircleIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { Page } from "@/components/page";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnconfiguredNotice } from "@/features/account/unconfigured-notice";
import {
  normalizeEmail,
  validateCurrentPassword,
  validateEmail,
  validateNewPassword,
} from "@/lib/auth/validation";
import { sanitizeReturnTo } from "@/lib/auth/redirects";
import type { AuthFailure, OAuthProvider } from "@/lib/auth/types";
import { useAuth } from "@/lib/auth/use-auth";
import { track } from "@/lib/telemetry/analytics";

type FieldErrors = Partial<
  Record<"email" | "password" | "acceptedTerms", string>
>;

/** Shows the failure's message under the field it belongs to, or as a form error. */
function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

function FormError({
  id,
  failure,
}: {
  id?: string;
  failure: AuthFailure | null;
}) {
  if (!failure) return null;
  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {failure.message}
    </p>
  );
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo") ?? "/");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<AuthFailure | null>(null);
  const [pending, setPending] = useState<
    "signIn" | "signUp" | OAuthProvider | "reset" | null
  >(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!auth.loading && auth.user) {
    return <Navigate to={returnTo} replace />;
  }

  if (!auth.isConfigured) {
    return (
      <Page title="Sign in" width="narrow">
        <UnconfiguredNotice />
      </Page>
    );
  }

  const busy = pending !== null;

  const applyFailure = (failure: AuthFailure) => {
    if (
      failure.field === "email" ||
      failure.field === "password" ||
      failure.field === "acceptedTerms"
    ) {
      setFieldErrors((prev) => ({
        ...prev,
        [failure.field as keyof FieldErrors]: failure.message,
      }));
      return;
    }
    setFormError(failure);
  };

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    const errors: FieldErrors = {};
    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmail(normalizedEmail);
    if (emailError) errors.email = emailError;
    const passwordError = validateCurrentPassword(password);
    if (passwordError) errors.password = passwordError;
    setFieldErrors(errors);
    setFormError(null);
    if (errors.email || errors.password) return;

    setPending("signIn");
    const result = await auth.signInWithPassword(normalizedEmail, password);
    setPending(null);
    if (result.ok) {
      toast.success("Signed in.");
      navigate(returnTo, { replace: true });
    } else {
      applyFailure(result.error);
    }
  };

  const handleSignUp = async (event: FormEvent) => {
    event.preventDefault();
    const errors: FieldErrors = {};
    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmail(normalizedEmail);
    if (emailError) errors.email = emailError;
    const passwordError = validateNewPassword(password);
    if (passwordError) errors.password = passwordError;
    if (!acceptedTerms) {
      errors.acceptedTerms =
        "Confirm that you are 13 or older and accept the terms to create an account.";
    }
    setFieldErrors(errors);
    setFormError(null);
    if (errors.email || errors.password || errors.acceptedTerms) return;

    setPending("signUp");
    const result = await auth.signUp({
      email: normalizedEmail,
      password,
      acceptedTerms,
    });
    setPending(null);
    if (result.ok) {
      track("sign_up_completed", { method: "email" });
      if (result.data.needsEmailConfirmation) {
        setNeedsEmailConfirmation(true);
      } else {
        toast.success("Account created.");
        navigate(returnTo, { replace: true });
      }
    } else {
      applyFailure(result.error);
    }
  };

  const handleProvider = async (provider: OAuthProvider) => {
    setFormError(null);
    setPending(provider);
    const result = await auth.signInWithProvider(provider, returnTo);
    setPending(null);
    if (!result.ok) applyFailure(result.error);
  };

  const handleReset = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmail(normalizedEmail);
    setFieldErrors({ email: emailError ?? undefined });
    setFormError(null);
    if (emailError) return;

    setPending("reset");
    const result = await auth.requestPasswordReset(normalizedEmail);
    setPending(null);
    if (result.ok) {
      setResetSent(true);
      toast.success("Check your email for the reset link.");
    } else {
      applyFailure(result.error);
    }
  };

  if (needsEmailConfirmation) {
    return (
      <Page title="Check your email" width="narrow">
        <Card>
          <CardContent className="grid gap-2 pt-6">
            <h1 className="font-heading text-xl font-semibold">
              Confirm your account
            </h1>
            <p className="text-sm text-muted-foreground">
              We sent a link to{" "}
              <span className="font-medium text-foreground">
                {normalizeEmail(email)}
              </span>
              . Open it to confirm your account and finish signing up.
            </p>
            <Button
              variant="link"
              className="h-auto p-0 justify-self-start"
              onClick={() => setNeedsEmailConfirmation(false)}
            >
              Sign in
            </Button>
          </CardContent>
        </Card>
      </Page>
    );
  }

  if (resetSent) {
    return (
      <Page title="Check your email" width="narrow">
        <Card>
          <CardContent className="grid gap-2 pt-6">
            <h1 className="font-heading text-xl font-semibold">
              Reset link sent
            </h1>
            <p className="text-sm text-muted-foreground">
              If an account exists for{" "}
              <span className="font-medium text-foreground">
                {normalizeEmail(email)}
              </span>
              , a password reset link is on its way. The link opens the reset
              page.
            </p>
            <Button
              variant="link"
              className="h-auto p-0 justify-self-start"
              onClick={() => setResetSent(false)}
            >
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Sign in" width="narrow">
      <div className="mx-auto grid w-full max-w-sm justify-items-center gap-6">
        <Link to="/" className="rounded-md" aria-label="OHKOLab home">
          <Wordmark className="text-3xl" />
        </Link>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <form className="grid gap-4" onSubmit={handleSignIn} noValidate>
                  <div className="grid gap-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      aria-invalid={fieldErrors.email ? true : undefined}
                      aria-describedby={
                        fieldErrors.email ? "signin-email-error" : undefined
                      }
                    />
                    <FieldError
                      id="signin-email-error"
                      message={fieldErrors.email}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      aria-invalid={fieldErrors.password ? true : undefined}
                      aria-describedby={
                        fieldErrors.password
                          ? "signin-password-error"
                          : undefined
                      }
                    />
                    <FieldError
                      id="signin-password-error"
                      message={fieldErrors.password}
                    />
                  </div>
                  <FormError id="signin-form-error" failure={formError} />
                  <Button
                    type="submit"
                    disabled={busy}
                    aria-describedby={
                      formError ? "signin-form-error" : undefined
                    }
                  >
                    {pending === "signIn" ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : null}
                    Sign in
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 justify-self-start"
                    onClick={handleReset}
                    disabled={busy}
                  >
                    Forgot password?
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <form className="grid gap-4" onSubmit={handleSignUp} noValidate>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      aria-invalid={fieldErrors.email ? true : undefined}
                      aria-describedby={
                        fieldErrors.email ? "signup-email-error" : undefined
                      }
                    />
                    <FieldError
                      id="signup-email-error"
                      message={fieldErrors.email}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      aria-invalid={fieldErrors.password ? true : undefined}
                      aria-describedby={
                        fieldErrors.password
                          ? "signup-password-error"
                          : undefined
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="signup-terms"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) =>
                          setAcceptedTerms(checked === true)
                        }
                        aria-invalid={
                          fieldErrors.acceptedTerms ? true : undefined
                        }
                        aria-describedby={
                          fieldErrors.acceptedTerms
                            ? "signup-terms-error"
                            : undefined
                        }
                      />
                      <Label
                        htmlFor="signup-terms"
                        className="font-normal leading-snug"
                      >
                        I am 13 or older and accept the{" "}
                        <Link
                          to="/terms"
                          className="text-primary underline underline-offset-4"
                        >
                          terms
                        </Link>{" "}
                        and{" "}
                        <Link
                          to="/privacy"
                          className="text-primary underline underline-offset-4"
                        >
                          privacy policy
                        </Link>
                      </Label>
                    </div>
                    <FieldError
                      id="signup-terms-error"
                      message={fieldErrors.acceptedTerms}
                    />
                  </div>
                  <FormError id="signup-form-error" failure={formError} />
                  <Button
                    type="submit"
                    disabled={busy}
                    aria-describedby={
                      formError ? "signup-form-error" : undefined
                    }
                  >
                    {pending === "signUp" ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : null}
                    Sign up
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid w-full gap-2">
          <Button
            variant="outline"
            onClick={() => handleProvider("google")}
            disabled={busy}
          >
            {pending === "google" ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : null}
            Continue with Google
          </Button>
          <Button
            variant="outline"
            onClick={() => handleProvider("discord")}
            disabled={busy}
          >
            {pending === "discord" ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : null}
            Continue with Discord
          </Button>
        </div>
      </div>
    </Page>
  );
}
