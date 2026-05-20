"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createTenant } from "@/lib/tenant-api";
import { setActiveTenant } from "@/lib/workspace-session";

const CURRENCIES = ["SGD", "USD", "EUR", "GBP", "MYR", "CNY", "JPY", "AUD"] as const;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function slugFromCompanyName(name: string): string {
  const raw = slugify(name);
  return raw.length > 0 ? raw : "company";
}

const STEPS = ["Company", "Currency & year", "Review"] as const;

export function CompanySetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<string>("SGD");
  const [fyMonth, setFyMonth] = useState("04");
  const [fyDay, setFyDay] = useState("01");
  const [submitting, setSubmitting] = useState(false);

  const fiscalMmdd = useMemo(() => `${fyMonth}-${fyDay}`, [fyMonth, fyDay]);
  const internalSlug = useMemo(() => slugFromCompanyName(name), [name]);

  const canNext0 = name.trim().length > 0;
  const canNext1 = CURRENCIES.includes(currency as (typeof CURRENCIES)[number]);

  async function onSubmit() {
    setSubmitting(true);
    try {
      const tenant = await createTenant({
        name: name.trim(),
        slug: internalSlug,
        base_currency: currency,
        fiscal_year_start_mmdd: fiscalMmdd,
      });
      setActiveTenant(tenant.id, tenant.current_user_role ?? "admin");
      toast.success("Company created", {
        description: "Singapore SME chart of accounts is being seeded in the background.",
      });
      router.push("/tenants");
    } catch (e) {
      toast.error("Could not create company", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Create your company</CardTitle>
        <CardDescription>
          Each company has its own ID, reporting currency, and financial year start. Your data stays
          separate from other companies on the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2 text-xs text-muted-foreground">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={
                i === step
                  ? "font-semibold text-foreground"
                  : i < step
                    ? "text-primary"
                    : ""
              }
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Pte Ltd" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/tenants">Cancel</Link>
              </Button>
              <Button type="button" disabled={!canNext0} onClick={() => setStep(1)}>
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Base currency</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Used as the reporting currency for this company.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Financial year starts (month / day)</label>
              <div className="flex gap-2">
                <select
                  className="flex h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                  value={fyMonth}
                  onChange={(e) => setFyMonth(e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  className="flex h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                  value={fyDay}
                  onChange={(e) => setFyDay(e.target.value)}
                >
                  {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Common Singapore SME choice: 1 April → <strong>04-01</strong>.
              </p>
            </div>
            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button type="button" disabled={!canNext1} onClick={() => setStep(2)}>
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-sm">
            <ul className="space-y-2 rounded-md border bg-muted/30 p-4">
              <li>
                <span className="text-muted-foreground">Company:</span> {name}
              </li>
              <li>
                <span className="text-muted-foreground">Base currency:</span> {currency}
              </li>
              <li>
                <span className="text-muted-foreground">FY start (MM-DD):</span> {fiscalMmdd}
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              When you create the company, we assign a unique ID and set up the default{" "}
              <strong>Singapore SME</strong> chart of accounts (when the accounting service is
              available).
            </p>
            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" disabled={submitting} onClick={onSubmit}>
                {submitting ? "Creating…" : "Create company"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
