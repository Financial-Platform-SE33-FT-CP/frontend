"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format-money";
import { formatApiError } from "@/lib/api";
import { getBalanceSheet, type BalanceSheetReport, type ReportAccountLine } from "@/lib/ledger-api";
import { cn } from "@/lib/utils";

type BalanceSheetPanelProps = {
  tenantId: string;
};

export function BalanceSheetPanel({ tenantId }: BalanceSheetPanelProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [asOfDate, setAsOfDate] = useState(today);
  const [data, setData] = useState<BalanceSheetReport | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const result = await getBalanceSheet(asOfDate || undefined);
      setData(result);
    } catch (e) {
      setData(null);
      toast.error("Could not load Balance Sheet", { description: formatApiError(e) });
    } finally {
      setBusy(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    void load();
  }, [load, tenantId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Sheet</CardTitle>
        <CardDescription>
          Statement of financial position — Assets = Liabilities + Equity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">As of date</span>
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
          </label>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void load()}>
            {busy ? "Loading…" : "Refresh"}
          </Button>
        </div>

        {data && (
          <>
            <div
              className={cn(
                "rounded-md border px-4 py-3 text-sm font-medium",
                data.is_balanced
                  ? "border-green-200 bg-green-50 text-green-900"
                  : "border-amber-200 bg-amber-50 text-amber-900",
              )}
            >
              {data.is_balanced ? (
                <span>
                  Balance Sheet is <strong>balanced</strong> — Assets {formatMoney(data.total_assets)}{" "}
                  = Liabilities {formatMoney(data.total_liabilities)} + Equity{" "}
                  {formatMoney(data.total_equity)}.
                </span>
              ) : (
                <span>
                  Balance Sheet is <strong>not balanced</strong>. Imbalance:{" "}
                  {formatMoney(data.imbalance)}.
                </span>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <BsSummaryCard label="Assets" amount={data.total_assets} />
              <BsSummaryCard label="Liabilities" amount={data.total_liabilities} />
              <BsSummaryCard label="Equity" amount={data.total_equity} />
            </div>

            <BsSectionTable title="Assets" lines={data.asset_lines} />
            <BsSectionTable title="Liabilities" lines={data.liability_lines} />
            <BsSectionTable title="Equity" lines={data.equity_lines} />

            {parseFloat(data.retained_earnings) !== 0 && (
              <div className="rounded-md border bg-muted/20 px-4 py-2 text-sm text-muted-foreground">
                Retained Earnings (computed):{" "}
                <span
                  className={cn(
                    "font-medium",
                    parseFloat(data.retained_earnings) >= 0
                      ? "text-green-700"
                      : "text-red-700",
                  )}
                >
                  {formatMoney(data.retained_earnings)}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BsSummaryCard({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="rounded-md border px-4 py-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{formatMoney(amount)}</p>
    </div>
  );
}

function BsSectionTable({ title, lines }: { title: string; lines: ReportAccountLine[] }) {
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
              <th className="px-3 py-2 text-right font-medium">Balance</th>
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
