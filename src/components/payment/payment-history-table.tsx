"use client";

import Link from "next/link";
import { paymentMethodLabel, type Payment } from "@/lib/ar-ap-api";
import { formatMoney } from "@/lib/format-money";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type PaymentHistoryTableProps = {
  payments: Payment[];
  loading?: boolean;
};

export function PaymentHistoryTable({ payments, loading }: PaymentHistoryTableProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Loading payments…
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No payments recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Payment date</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium">Method</th>
            <th className="px-4 py-3 font-medium">Reference</th>
            <th className="px-4 py-3 font-medium">Journal entry</th>
            <th className="px-4 py-3 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-b border-muted last:border-0">
              <td className="px-4 py-3">{formatDate(payment.payment_date)}</td>
              <td className="px-4 py-3 text-right font-mono">
                {formatMoney(payment.amount)}
              </td>
              <td className="px-4 py-3">
                {paymentMethodLabel(String(payment.payment_method))}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {payment.reference || "—"}
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                {payment.journal_entry_id ? (
                  <Link
                    href="/journal-entries"
                    className="text-primary underline-offset-4 hover:underline"
                    title="View journal entries"
                  >
                    {payment.journal_entry_id}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDateTime(payment.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
