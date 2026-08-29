"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";
import type { CreditNoteSummaryDisplay } from "@/lib/credit-note-calc";

type CreditNoteSummaryCardProps = {
  summary: CreditNoteSummaryDisplay;
};

export function CreditNoteSummaryCard({ summary }: CreditNoteSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Credit note summary</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Original invoice total</dt>
            <dd className="font-mono text-lg font-semibold">
              {formatMoney(summary.invoiceTotal)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Existing credit notes</dt>
            <dd className="font-mono text-lg font-semibold">
              {formatMoney(summary.creditNotesTotal)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Remaining creditable amount</dt>
            <dd className="font-mono text-lg font-semibold text-amber-700 dark:text-amber-400">
              {formatMoney(summary.remainingCreditable)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
