"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import {
  downloadOpeningBalanceTemplate,
  getOpeningBalanceStatus,
  importOpeningBalanceCsv,
  type OpeningValidateResponse,
  validateOpeningBalanceCsv,
} from "@/lib/ledger-api";
import { useActiveTenantId } from "@/hooks/use-active-tenant";
import { isAuthenticated } from "@/lib/auth";
import { canEditAccountingData } from "@/lib/tenant-roles";
import { formatApiError } from "@/lib/api";

export default function OpeningBalancePage() {
  const role = useWorkspaceRole();
  const canEdit = canEditAccountingData(role);
  const tenantId = useActiveTenantId();

  const [file, setFile] = useState<File | null>(null);
  const [entryDate, setEntryDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [reference, setReference] = useState("OPENING");
  const [validation, setValidation] = useState<OpeningValidateResponse | null>(null);
  const [posted, setPosted] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!tenantId) return;
    try {
      const s = await getOpeningBalanceStatus();
      setPosted(s.posted);
    } catch {
      setPosted(null);
    }
  }, [tenantId]);

  async function handleDownloadTemplate() {
    if (!isAuthenticated()) {
      toast.error("Sign in required", {
        description: "Log out and sign in again to refresh your session.",
      });
      return;
    }
    if (!tenantId) {
      toast.error("No company selected", {
        description: "Open Tenants and select a company first.",
      });
      return;
    }
    setBusy(true);
    try {
      const blob = await downloadOpeningBalanceTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "opening_balance_template.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Template downloaded");
    } catch (e) {
      toast.error("Download failed", { description: formatApiError(e) });
    } finally {
      setBusy(false);
    }
  }

  async function handleValidate() {
    if (!file) {
      toast.error("Choose a CSV file first");
      return;
    }
    setBusy(true);
    setValidation(null);
    try {
      const result = await validateOpeningBalanceCsv(file);
      setValidation(result);
      if (result.valid) {
        toast.success("Validation passed — ready to import");
      } else {
        toast.error("Validation failed", {
          description: `${result.errors.length} issue(s) found`,
        });
      }
    } catch (e) {
      toast.error("Validation failed", { description: formatApiError(e) });
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    if (!file) {
      toast.error("Choose a CSV file first");
      return;
    }
    setBusy(true);
    try {
      const result = await importOpeningBalanceCsv(file, entryDate, reference);
      toast.success("Opening balance imported", {
        description: `Journal ${result.journal_entry_id} · ${result.line_count} lines`,
      });
      setValidation(null);
      setPosted(true);
    } catch (e) {
      toast.error("Import failed", { description: formatApiError(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Opening balance import</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a CSV trial balance (with optional AR/AP aging). The system creates one
          opening journal entry when debits equal credits.
        </p>
      </div>

      <RoleGate
        allow={tenantId != null}
        fallback={
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Select a company on the Tenants page before importing opening balances.
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={refreshStatus}>
            Check status
          </Button>
          {posted === true && (
            <span className="self-center text-sm text-amber-700">
              Opening balance already posted for this company.
            </span>
          )}
        </div>

        <RoleGate
          allow={canEdit}
          fallback={
            <Card>
              <CardContent className="pt-6 text-muted-foreground">
                Viewer role: you can download the template but cannot import.
              </CardContent>
            </Card>
          }
        >
          <Card>
            <CardHeader>
              <CardTitle>CSV import</CardTitle>
              <CardDescription>
                Columns: section, account_code, debit, credit, counterparty_name, amount,
                due_date, reference, description. Sections: trial_balance, ar_aging, ap_aging.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={handleDownloadTemplate}
                >
                  Download template
                </Button>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setValidation(null);
                  }}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Entry date</span>
                  <Input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Reference</span>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="OPENING"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || !file}
                  onClick={handleValidate}
                >
                  Validate
                </Button>
                <Button
                  type="button"
                  disabled={busy || !file || posted === true}
                  onClick={handleImport}
                >
                  Import &amp; post
                </Button>
              </div>

              {validation && (
                <div className="space-y-3 rounded-md border p-4">
                  {validation.preview && (
                    <div className="text-sm text-muted-foreground">
                      <p>
                        Trial balance lines: {validation.preview.trial_balance_line_count} ·
                        Debits {validation.preview.total_debit} · Credits{" "}
                        {validation.preview.total_credit}
                      </p>
                      <p>
                        AR aging: {validation.preview.ar_aging_line_count} (
                        {validation.preview.ar_aging_total}) · AP aging:{" "}
                        {validation.preview.ap_aging_line_count} (
                        {validation.preview.ap_aging_total})
                      </p>
                    </div>
                  )}
                  {validation.errors.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
                      {validation.errors.map((err, i) => (
                        <li key={`${err.field}-${err.row}-${i}`}>
                          {err.row != null ? `Row ${err.row}: ` : ""}
                          {err.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  {validation.valid && validation.errors.length === 0 && (
                    <p className="text-sm text-green-700">All checks passed.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </RoleGate>
      </RoleGate>
    </div>
  );
}
