"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/invoice/invoice-status-badge";
import { formatMoney } from "@/lib/format-money";
import type { InvoiceStatus } from "@/lib/ar-ap-api";
import type { PaymentSummaryDisplay } from "@/lib/payment-calc";

type PaymentSummaryCardProps = {
  summary: PaymentSummaryDisplay;
  status: InvoiceStatus | string;
};

export function PaymentSummaryCard({ summary, status }: PaymentSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-lg">Payment summary</CardTitle>
        <InvoiceStatusBadge status={status} />
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Invoice total</dt>
            <dd className="font-mono text-lg font-semibold">
              {formatMoney(summary.invoiceTotal)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Paid amount</dt>
            <dd className="font-mono text-lg font-semibold">
              {formatMoney(summary.amountPaid)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Outstanding balance</dt>
            <dd className="font-mono text-lg font-semibold text-amber-700 dark:text-amber-400">
              {formatMoney(summary.outstanding)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
