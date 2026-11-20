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
import { useT } from "@/lib/i18n/t";
import { track } from "@/lib/telemetry/analytics";
import { useCaptcha } from "@/lib/turnstile/use-captcha";

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
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo") ?? "/");
  // `?tab=signup` (the signed-out home welcome) opens on the sign-up tab.
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "signin";

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
  // Each form carries its own Turnstile challenge (tokens are one-time), so
  // a token is never reused between the sign-in, reset and sign-up flows.
  // With no site key configured both stay inert and the forms work as before.
  const signInCaptcha = useCaptcha();
  const signUpCaptcha = useCaptcha();

  if (!auth.loading && auth.user) {
    return <Navigate to={returnTo} replace />;
  }

  if (!auth.isConfigured) {
    return (
      <Page title={t("common.signIn")} width="narrow">
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
    const result = signInCaptcha.token
      ? await auth.signInWithPassword(
          normalizedEmail,
          password,
          signInCaptcha.token,
        )
      : await auth.signInWithPassword(normalizedEmail, password);
    setPending(null);
    if (result.ok) {
      toast.success(t("login.signedInToast"));
      navigate(returnTo, { replace: true });
    } else {
      applyFailure(result.error);
      // The failed submit consumed the token: demand a fresh one.
      signInCaptcha.retry();
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
      errors.acceptedTerms = t("login.acceptTermsError");
    }
    setFieldErrors(errors);
    setFormError(null);
    if (errors.email || errors.password || errors.acceptedTerms) return;

    setPending("signUp");
    const result = await auth.signUp({
      email: normalizedEmail,
      password,
      acceptedTerms,
      captchaToken: signUpCaptcha.token ?? undefined,
    });
    setPending(null);
    if (result.ok) {
      track("sign_up_completed", { method: "email" });
      if (result.data.needsEmailConfirmation) {
        setNeedsEmailConfirmation(true);
      } else {
        toast.success(t("login.accountCreatedToast"));
        navigate(returnTo, { replace: true });
      }
    } else {
      applyFailure(result.error);
      // The failed submit consumed the token: demand a fresh one.
      signUpCaptcha.retry();
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
    const result = signInCaptcha.token
      ? await auth.requestPasswordReset(normalizedEmail, signInCaptcha.token)
      : await auth.requestPasswordReset(normalizedEmail);
    setPending(null);
    if (result.ok) {
      setResetSent(true);
      toast.success(t("login.resetSentToast"));
    } else {
      applyFailure(result.error);
      // The failed request consumed the token: demand a fresh one.
      signInCaptcha.retry();
    }
  };

  if (needsEmailConfirmation) {
    return (
      <Page title={t("login.checkEmailTitle")} width="narrow">
        <Card>
          <CardContent className="grid gap-2 pt-6">
            <h2 className="font-heading text-xl font-semibold">
              {t("login.confirmAccountTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("login.confirmAccountPrefix")}{" "}
              <span className="font-medium text-foreground">
                {normalizeEmail(email)}
              </span>
              {t("login.confirmAccountSuffix")}
            </p>
            <Button
              variant="link"
              className="relative h-auto p-0 justify-self-start after:absolute after:-inset-y-3 after:inset-x-0"
              onClick={() => setNeedsEmailConfirmation(false)}
            >
              {t("common.signIn")}
            </Button>
          </CardContent>
        </Card>
      </Page>
    );
  }

  if (resetSent) {
    return (
      <Page title={t("login.checkEmailTitle")} width="narrow">
        <Card>
          <CardContent className="grid gap-2 pt-6">
            <h2 className="font-heading text-xl font-semibold">
              {t("login.resetSentTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("login.resetSentPrefix")}{" "}
              <span className="font-medium text-foreground">
                {normalizeEmail(email)}
              </span>
              {t("login.resetSentSuffix")}
            </p>
            <Button
              variant="link"
              className="relative h-auto p-0 justify-self-start after:absolute after:-inset-y-3 after:inset-x-0"
              onClick={() => setResetSent(false)}
            >
              {t("login.backToSignIn")}
            </Button>
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <Page title={t("common.signIn")} width="narrow">
      <div className="mx-auto grid w-full max-w-sm justify-items-center gap-6">
        <Link
          to="/"
          className="relative rounded-md after:absolute after:-inset-y-2 after:inset-x-0"
          aria-label={t("nav.homeAria")}
        >
          <Wordmark className="text-3xl" />
        </Link>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="signin">{t("common.signIn")}</TabsTrigger>
            <TabsTrigger value="signup">{t("login.signUpTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <form className="grid gap-4" onSubmit={handleSignIn} noValidate>
                  <div className="grid gap-2">
                    <Label htmlFor="signin-email">{t("login.email")}</Label>
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
                    <Label htmlFor="signin-password">
                      {t("login.password")}
                    </Label>
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
                  {signInCaptcha.widget}
                  <Button
                    type="submit"
                    disabled={busy || signInCaptcha.missing}
                    aria-describedby={
                      formError ? "signin-form-error" : undefined
                    }
                    className="max-md:h-11"
                  >
                    {pending === "signIn" ? (
                      <LoaderCircleIcon className="animate-spin" aria-hidden />
                    ) : null}
                    {t("common.signIn")}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="relative h-auto p-0 justify-self-start after:absolute after:-inset-y-3 after:inset-x-0"
                    onClick={handleReset}
                    disabled={busy || signInCaptcha.missing}
                  >
                    {t("login.forgotPassword")}
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
                    <Label htmlFor="signup-email">{t("login.email")}</Label>
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
                    <Label htmlFor="signup-password">
                      {t("login.password")}
                    </Label>
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
                        {t("login.termsPrefix")}{" "}
                        <Link
                          to="/terms"
                          className="text-primary underline underline-offset-4"
                        >
                          {t("login.termsLink")}
                        </Link>{" "}
                        {t("login.termsJoin")}{" "}
                        <Link
                          to="/privacy"
                          className="text-primary underline underline-offset-4"
                        >
                          {t("login.privacyLink")}
                        </Link>
                        {t("login.termsSuffix")}
                      </Label>
                    </div>
                    <FieldError
                      id="signup-terms-error"
                      message={fieldErrors.acceptedTerms}
                    />
                  </div>
                  <FormError id="signup-form-error" failure={formError} />
                  {signUpCaptcha.widget}
                  <Button
                    type="submit"
                    disabled={busy || signUpCaptcha.missing}
                    aria-describedby={
                      formError ? "signup-form-error" : undefined
                    }
                    className="max-md:h-11"
                  >
                    {pending === "signUp" ? (
                      <LoaderCircleIcon className="animate-spin" aria-hidden />
                    ) : null}
                    {t("login.signUpTab")}
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
            className="max-md:h-11"
          >
            {pending === "google" ? (
              <LoaderCircleIcon className="animate-spin" aria-hidden />
            ) : null}
            {t("login.continueGoogle")}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleProvider("discord")}
            disabled={busy}
            className="max-md:h-11"
          >
            {pending === "discord" ? (
              <LoaderCircleIcon className="animate-spin" aria-hidden />
            ) : null}
            {t("login.continueDiscord")}
          </Button>
        </div>
      </div>
    </Page>
  );
}
