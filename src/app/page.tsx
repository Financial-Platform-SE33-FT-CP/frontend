import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <main className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Accounting Platform
        </h1>
        <p className="max-w-md text-muted-foreground">
          Multi-tenant accounting and financial management system.
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Create account
          </Link>
        </div>
      </main>
    </div>
  );
}
