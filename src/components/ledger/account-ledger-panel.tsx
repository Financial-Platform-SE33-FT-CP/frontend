"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listCoaAccounts, type CoaAccount } from "@/lib/coa-api";
import { formatAccountType, formatMoney } from "@/lib/format-money";
import { formatApiError } from "@/lib/api";
import { getAccountLedger, type AccountLedgerView } from "@/lib/ledger-api";

type AccountLedgerPanelProps = {
  tenantId: string;
  selectedAccountId: string;
  onAccountChange: (accountId: string) => void;
};

export function AccountLedgerPanel({
  tenantId,
  selectedAccountId,
  onAccountChange,
}: AccountLedgerPanelProps) {
  const [accounts, setAccounts] = useState<CoaAccount[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [ledger, setLedger] = useState<AccountLedgerView | null>(null);
  const [busy, setBusy] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listCoaAccounts();
        if (!cancelled) {
          setAccounts(list.filter((a) => a.is_active));
          setAccountsError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setAccounts([]);
          setAccountsError(formatApiError(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const loadLedger = useCallback(async () => {
    if (!selectedAccountId) return;
    setBusy(true);
    try {
      const result = await getAccountLedger(selectedAccountId, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setLedger(result);
    } catch (e) {
      setLedger(null);
      toast.error("Could not load account ledger", { description: formatApiError(e) });
    } finally {
      setBusy(false);
    }
  }, [selectedAccountId, fromDate, toDate]);

  useEffect(() => {
    if (selectedAccountId) {
      void loadLedger();
    } else {
      setLedger(null);
    }
  }, [loadLedger, selectedAccountId]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account ledger</CardTitle>
        <CardDescription>
          Transaction history with running balance for one chart-of-accounts line.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accountsError && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Could not load accounts from COA service: {accountsError}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-1 text-sm lg:col-span-1">
            <span className="font-medium">Account</span>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedAccountId}
              onChange={(e) => onAccountChange(e.target.value)}
            >
              <option value="">Select an account…</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} — {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">From date</span>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">To date</span>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={busy || !selectedAccountId}
          onClick={() => void loadLedger()}
        >
          {busy ? "Loading…" : "Refresh"}
        </Button>

        {selectedAccount && ledger && (
          <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm">
            <p className="font-medium">
              {ledger.account_code} — {ledger.account_name}
            </p>
            <p className="text-muted-foreground">{formatAccountType(ledger.account_type)}</p>
            <div className="mt-2 flex flex-wrap gap-6">
              <span>
                Opening: <strong className="tabular-nums">{formatMoney(ledger.opening_balance)}</strong>
              </span>
              <span>
                Closing: <strong className="tabular-nums">{formatMoney(ledger.closing_balance)}</strong>
              </span>
            </div>
          </div>
        )}

        {ledger && selectedAccountId && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Reference</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Debit</th>
                  <th className="px-3 py-2 text-right font-medium">Credit</th>
                  <th className="px-3 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      No transactions in this date range.
                    </td>
                  </tr>
                ) : (
                  ledger.transactions.map((tx) => (
                    <tr key={tx.journal_line_id} className="border-b last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap">{tx.entry_date}</td>
                      <td className="px-3 py-2 font-mono text-xs">{tx.reference}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {tx.line_description || tx.entry_description || "—"}
                        {tx.source_type ? (
                          <span className="ml-1 text-xs">({tx.source_type})</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {Number.parseFloat(tx.debit_amount) > 0
                          ? formatMoney(tx.debit_amount)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {Number.parseFloat(tx.credit_amount) > 0
                          ? formatMoney(tx.credit_amount)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {formatMoney(tx.running_balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!selectedAccountId && (
          <p className="text-sm text-muted-foreground">
            Choose an account to view its general ledger activity.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
