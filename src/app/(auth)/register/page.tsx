"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatApiError } from "@/lib/api";
import { fetchAuthMe, loginUser, registerUser } from "@/lib/auth-api";
import { isAuthenticated } from "@/lib/auth";
import { setWorkspaceUserId } from "@/lib/workspace-session";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/tenants");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const trimmedName = fullName.trim();
      const res = await registerUser({
        email,
        password,
        full_name: trimmedName.length > 0 ? trimmedName : null,
      });

      if (res.email_verified) {
        await loginUser({ email, password });
        const me = await fetchAuthMe();
        setWorkspaceUserId(me.id);
        router.push("/tenants");
        return;
      }

      const em = res.email.trim().toLowerCase();
      if (typeof window !== "undefined" && res.verification_code) {
        sessionStorage.setItem(`auth_dev_verify_code:${em}`, res.verification_code);
      }
      router.push(`/verify-email?email=${encodeURIComponent(res.email)}`);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Create an account
          </CardTitle>
          <div className="text-sm text-muted-foreground" suppressHydrationWarning>
            Register with email and password. Use 8+ characters including uppercase,
            lowercase, and a digit.
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
          <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Full name <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Lee"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Work email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">At least 8 characters (same as API).</p>
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/verify-email"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Enter email verification code
            </Link>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
