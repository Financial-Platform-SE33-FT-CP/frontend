"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AccountPicker } from "@/components/ui/account-picker";
import {
  getReconciliationSuggestions,
  reconcileTransaction,
  type BankTransaction,
  type ReconciliationSuggestion,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";

type Props = {
  transactions: BankTransaction[];
  loading: boolean;
  bankAccountId: string;
  onReconciled: () => void;
};

export default function UnmatchedTransactions({
  transactions,
  loading,
  bankAccountId,
  onReconciled,
}: Props) {
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ReconciliationSuggestion[]>(
    [],
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [manualAccountId, setManualAccountId] = useState("");

  async function handleShowSuggestions(txnId: string) {
    setSelectedTxnId(txnId);
    setLoadingSuggestions(true);
    setSuggestions([]);
    setManualAccountId("");
    try {
      const result = await getReconciliationSuggestions(txnId);
      setSuggestions(result);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleReconcile(suggestion: ReconciliationSuggestion) {
    if (!selectedTxnId) return;
    setReconciling(true);
    try {
      await reconcileTransaction({
        transaction_id: selectedTxnId,
        match_type: suggestion.match_type,
        match_id: suggestion.match_id,
        account_id: bankAccountId,
      });
      toast.success("Transaction reconciled successfully.");
      setSelectedTxnId(null);
      setSuggestions([]);
      onReconciled();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setReconciling(false);
    }
  }

  async function handleManualReconcile() {
    if (!selectedTxnId || !manualAccountId) return;
    setReconciling(true);
    try {
      await reconcileTransaction({
        transaction_id: selectedTxnId,
        match_type: "other",
        match_id: null,
        account_id: manualAccountId,
      });
      toast.success("Transaction reconciled (manual match).");
      setSelectedTxnId(null);
      setSuggestions([]);
      setManualAccountId("");
      onReconciled();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setReconciling(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Loading unmatched transactions…
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        All transactions have been reconciled.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Unmatched Transactions ({transactions.length})
      </h3>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn.id} className="border-t">
                <td className="px-3 py-2">{txn.transaction_date}</td>
                <td className="px-3 py-2">{txn.description ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono">{txn.amount}</td>
                <td className="px-3 py-2 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShowSuggestions(txn.id)}
                    disabled={loadingSuggestions && selectedTxnId === txn.id}
                  >
                    Match
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTxnId && (
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 font-medium">Matching Suggestions</h4>
          {loadingSuggestions ? (
            <p className="text-sm text-muted-foreground">
              Loading suggestions…
            </p>
          ) : suggestions.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No matching invoices or bills found for this transaction.
              </p>
              <p className="text-sm font-medium">Manual match</p>
              <p className="text-xs text-muted-foreground">
                Select the account to post the other side of the journal entry.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-80">
                  <AccountPicker
                    value={manualAccountId}
                    onChange={setManualAccountId}
                    placeholder="Search by code or name…"
                  />
                </div>
                <Button
                  size="sm"
                  disabled={reconciling || !manualAccountId}
                  onClick={handleManualReconcile}
                >
                  {reconciling ? "…" : "Reconcile (manual)"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {s.match_label}
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {s.match_type}
                      </span>
                      {s.confidence === "exact" && (
                        <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                          exact
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Amount: {s.match_amount}
                      {s.difference !== "0.00" && (
                        <span className="ml-2">(diff: {s.difference})</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={reconciling}
                    onClick={() => handleReconcile(s)}
                  >
                    {reconciling ? "…" : "Reconcile"}
                  </Button>
                </div>
              ))}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Manual match (no suggestion)
                </summary>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <div className="w-80">
                    <AccountPicker
                      value={manualAccountId}
                      onChange={setManualAccountId}
                      placeholder="Search by code or name…"
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={reconciling || !manualAccountId}
                    onClick={handleManualReconcile}
                  >
                    {reconciling ? "…" : "Reconcile (manual)"}
                  </Button>
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
