"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatApiError } from "@/lib/api";
import { resendVerificationCode, verifyEmailCode } from "@/lib/auth-api";
import { isAuthenticated } from "@/lib/auth";

const DEV_CODE_KEY_PREFIX = "auth_dev_verify_code:";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devHint, setDevHint] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/tenants");
    }
  }, [router]);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    const key = `${DEV_CODE_KEY_PREFIX}${email.trim().toLowerCase()}`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      setDevHint(`Local dev: your last issued code was ${stored}.`);
    }
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const res = await verifyEmailCode({ email, code });
      setInfo(res.message);
      sessionStorage.removeItem(`${DEV_CODE_KEY_PREFIX}${email.trim().toLowerCase()}`);
      setTimeout(() => {
        router.replace("/login?verified=1");
      }, 1200);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setError(null);
    setInfo(null);
    setResendPending(true);
    try {
      const res = await resendVerificationCode(email);
      const em = email.trim().toLowerCase();
      if (res.verification_code) {
        sessionStorage.setItem(`${DEV_CODE_KEY_PREFIX}${em}`, res.verification_code);
        setDevHint(`Local dev: new code ${res.verification_code} (also check your inbox).`);
      }
      setInfo(
        `${res.message} If nothing arrives, wait 60s before resending (rate limit) and check spam.`,
      );
      setCooldown(60);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setResendPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Verify your email
          </CardTitle>
          <CardDescription>
            Enter the numeric code from your verification email, then sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {devHint ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
              {devHint}
            </p>
          ) : null}
          {info ? (
            <div
              role="status"
              className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground"
            >
              {info}
            </div>
          ) : null}
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="ve-email" className="text-sm font-medium leading-none">
                Email
              </label>
              <Input
                id="ve-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="ve-code" className="text-sm font-medium leading-none">
                Verification code
              </label>
              <Input
                id="ve-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                placeholder="Digits only"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                minLength={4}
                maxLength={12}
                disabled={pending}
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Verifying…" : "Verify email"}
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resendPending || cooldown > 0 || !email.trim()}
          >
            {resendPending
              ? "Sending…"
              : cooldown > 0
                ? `Resend code (${cooldown}s)`
                : "Resend code"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Back to sign in
            </Link>
            {" · "}
            <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
