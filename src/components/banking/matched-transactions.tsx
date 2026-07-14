"use client";

import { type BankTransaction } from "@/lib/ar-ap-api";

type Props = {
  transactions: BankTransaction[];
  loading: boolean;
};

export default function MatchedTransactions({ transactions, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Loading reconciled transactions…
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No reconciled transactions yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Reconciled Transactions ({transactions.length})
      </h3>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 text-left font-medium">Matched To</th>
              <th className="px-3 py-2 text-left font-medium">Journal Entry</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn.id} className="border-t">
                <td className="px-3 py-2">{txn.transaction_date}</td>
                <td className="px-3 py-2">{txn.description ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono">{txn.amount}</td>
                <td className="px-3 py-2 text-xs">
                  {txn.reconciliation_entity_type ? (
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      {txn.reconciliation_entity_type}
                      <span className="ml-1 font-mono">
                        {txn.reconciliation_entity_id?.slice(0, 8)}…
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {txn.journal_entry_id
                    ? `${txn.journal_entry_id.slice(0, 8)}…`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
