"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import BankStatementUpload from "@/components/banking/bank-statement-upload";
import UnmatchedTransactions from "@/components/banking/unmatched-transactions";
import MatchedTransactions from "@/components/banking/matched-transactions";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { canEditAccountingData, canViewTenant } from "@/lib/tenant-roles";
import {
  listBankAccounts,
  createBankAccount,
  listUnmatched,
  listMatched,
  type BankTransaction,
  type BankAccount,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";

export default function BankingPage() {
  const role = useWorkspaceRole();
  const canEdit = canEditAccountingData(role);
  const canView = canViewTenant(role);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [unmatched, setUnmatched] = useState<BankTransaction[]>([]);
  const [matched, setMatched] = useState<BankTransaction[]>([]);
  const [loadingUnmatched, setLoadingUnmatched] = useState(false);
  const [loadingMatched, setLoadingMatched] = useState(false);

  const loadBankAccounts = useCallback(async () => {
    try {
      const accounts = await listBankAccounts();
      setBankAccounts(accounts);
      if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }, [selectedAccountId]);

  const loadUnmatched = useCallback(async () => {
    setLoadingUnmatched(true);
    try {
      const result = await listUnmatched(selectedAccountId || undefined);
      setUnmatched(result);
    } catch (err) {
      toast.error(formatApiError(err));
      setUnmatched([]);
    } finally {
      setLoadingUnmatched(false);
    }
  }, [selectedAccountId]);

  const loadMatched = useCallback(async () => {
    setLoadingMatched(true);
    try {
      const result = await listMatched(selectedAccountId || undefined);
      setMatched(result);
    } catch (err) {
      toast.error(formatApiError(err));
      setMatched([]);
    } finally {
      setLoadingMatched(false);
    }
  }, [selectedAccountId]);

  const refreshAll = useCallback(() => {
    loadUnmatched();
    loadMatched();
  }, [loadUnmatched, loadMatched]);

  useEffect(() => {
    if (canView) {
      loadBankAccounts();
    }
  }, [canView, loadBankAccounts]);

  useEffect(() => {
    if (canView && selectedAccountId) {
      refreshAll();
    }
  }, [canView, selectedAccountId, refreshAll]);

  async function handleCreateAccount() {
    const name = prompt("Bank account name:");
    if (!name) return;
    try {
      const account = await createBankAccount({ name });
      setBankAccounts((prev) => [...prev, account]);
      setSelectedAccountId(account.id);
      toast.success(`Bank account "${account.name}" created.`);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Banking &amp; Reconciliation
          </h1>
          <p className="mt-2 text-muted-foreground">
            Upload bank statements (CSV) and reconcile transactions against
            invoices and payments.
          </p>
        </div>
      </div>

      <RoleGate
        allow={canView}
        fallback={
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Select a company on the Tenants page to view banking.
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">Bank Account:</label>
          <select
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            {bankAccounts.length === 0 && (
              <option value="">No bank accounts</option>
            )}
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
          {canEdit && (
            <button
              className="text-sm text-primary underline-offset-4 hover:underline"
              onClick={handleCreateAccount}
            >
              + New account
            </button>
          )}
        </div>

        {selectedAccountId && (
          <>
            {canEdit && (
              <BankStatementUpload
                bankAccountId={selectedAccountId}
                onUploaded={refreshAll}
              />
            )}

            <UnmatchedTransactions
              transactions={unmatched}
              loading={loadingUnmatched}
              bankAccountId={selectedAccountId}
              onReconciled={refreshAll}
            />

            <MatchedTransactions
              transactions={matched}
              loading={loadingMatched}
            />
          </>
        )}
      </RoleGate>
    </div>
  );
}
