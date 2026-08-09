"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format-money";
import { formatApiError } from "@/lib/api";
import { getProfitLoss, type ProfitLossReport, type ReportAccountLine } from "@/lib/ledger-api";
import { cn } from "@/lib/utils";

type ProfitLossPanelProps = {
  tenantId: string;
};

export function ProfitLossPanel({ tenantId }: ProfitLossPanelProps) {
  const today = new Date().toISOString().slice(0, 10);
  const thisYear = today.slice(0, 4);
  const [fromDate, setFromDate] = useState(`${thisYear}-01-01`);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState<ProfitLossReport | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const result = await getProfitLoss(fromDate || undefined, toDate || undefined);
      setData(result);
    } catch (e) {
      setData(null);
      toast.error("Could not load P&L", { description: formatApiError(e) });
    } finally {
      setBusy(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void load();
  }, [load, tenantId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit & Loss</CardTitle>
        <CardDescription>
          Revenue and expense summary for the selected date range.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">From</span>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">To</span>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void load()}>
            {busy ? "Loading…" : "Refresh"}
          </Button>
        </div>

        {data && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label="Revenue" amount={data.total_revenue} tone="green" />
              <SummaryCard label="Expense" amount={data.total_expense} tone="amber" />
              <SummaryCard
                label="Net Profit"
                amount={data.net_profit}
                tone={parseFloat(data.net_profit) >= 0 ? "green" : "red"}
              />
            </div>

            <SectionTable title="Revenue" lines={data.revenue_lines} />
            <SectionTable title="Expenses" lines={data.expense_lines} />

            <div className="rounded-md border px-4 py-3 text-sm font-medium">
              Net Profit = Revenue {formatMoney(data.total_revenue)} &minus; Expense{" "}
              {formatMoney(data.total_expense)} ={" "}
              <span
                className={cn(
                  parseFloat(data.net_profit) >= 0 ? "text-green-700" : "text-red-700",
                )}
              >
                {formatMoney(data.net_profit)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: string;
  tone: "green" | "red" | "amber";
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3 text-center",
        tone === "green" && "border-green-200 bg-green-50",
        tone === "red" && "border-red-200 bg-red-50",
        tone === "amber" && "border-amber-200 bg-amber-50",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-xl font-bold tabular-nums",
          tone === "green" && "text-green-700",
          tone === "red" && "text-red-700",
          tone === "amber" && "text-amber-700",
        )}
      >
        {formatMoney(amount)}
      </p>
    </div>
  );
}

function SectionTable({ title, lines }: { title: string; lines: ReportAccountLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((ln) => (
              <tr key={ln.account_id} className="border-b last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{ln.account_code}</td>
                <td className="px-3 py-2">{ln.account_name}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatMoney(Math.abs(parseFloat(ln.net_amount)).toString())}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
