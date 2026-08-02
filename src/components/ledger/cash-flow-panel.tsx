"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format-money";
import { formatApiError } from "@/lib/api";
import { getCashFlow, type CashFlowReport, type CashFlowSectionLine } from "@/lib/ledger-api";
import { cn } from "@/lib/utils";

type CashFlowPanelProps = {
  tenantId: string;
};

export function CashFlowPanel({ tenantId }: CashFlowPanelProps) {
  const today = new Date().toISOString().slice(0, 10);
  const thisYear = today.slice(0, 4);
  const [fromDate, setFromDate] = useState(`${thisYear}-01-01`);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState<CashFlowReport | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const result = await getCashFlow(fromDate, toDate);
      setData(result);
    } catch (e) {
      setData(null);
      toast.error("Could not load Cash Flow", { description: formatApiError(e) });
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
        <CardTitle>Cash Flow Statement</CardTitle>
        <CardDescription>
          Indirect method — Net Income adjusted for non-cash items and working capital changes.
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
            <div className="grid gap-4 md:grid-cols-4">
              <CfCard label="Net Income" amount={data.net_income} />
              <CfCard label="Operating CF" amount={data.operating_cash_flow} />
              <CfCard label="Investing CF" amount={data.investing_cash_flow} />
              <CfCard label="Financing CF" amount={data.financing_cash_flow} />
            </div>

            <SectionBlock
              title="Operating Activities"
              netIncome={data.net_income}
              adjustments={data.operating_adjustments}
              subtotal={data.operating_cash_flow}
            />
            <SectionBlock
              title="Investing Activities"
              adjustments={data.investing_adjustments}
              subtotal={data.investing_cash_flow}
            />
            <SectionBlock
              title="Financing Activities"
              adjustments={data.financing_adjustments}
              subtotal={data.financing_cash_flow}
            />

            <div className="rounded-md border bg-muted/20 px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Net cash change</span>
                <span className="font-bold tabular-nums">{formatMoney(data.net_cash_change)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Beginning cash ({data.from_date})</span>
                <span className="tabular-nums">{formatMoney(data.beginning_cash)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Ending cash ({data.to_date})</span>
                <span className="tabular-nums">{formatMoney(data.ending_cash)}</span>
              </div>
              <div
                className={cn(
                  "text-xs",
                  parseFloat(data.ending_cash) ===
                    parseFloat(data.beginning_cash) + parseFloat(data.net_cash_change)
                    ? "text-green-600"
                    : "text-red-600",
                )}
              >
                {parseFloat(data.ending_cash) ===
                parseFloat(data.beginning_cash) + parseFloat(data.net_cash_change)
                  ? "✓ Ending cash = Beginning + Change"
                  : "✗ Reconciliation mismatch"}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CfCard({ label, amount }: { label: string; amount: string }) {
  const num = parseFloat(amount);
  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3 text-center",
        num >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-bold tabular-nums",
          num >= 0 ? "text-green-700" : "text-red-700",
        )}
      >
        {formatMoney(amount)}
      </p>
    </div>
  );
}

function SectionBlock({
  title,
  netIncome,
  adjustments,
  subtotal,
}: {
  title: string;
  netIncome?: string;
  adjustments: CashFlowSectionLine[];
  subtotal: string;
}) {
  if (!netIncome && adjustments.length === 0) return null;
  return (
    <div className="rounded-md border">
      <h4 className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">{title}</h4>
      <div className="px-4 py-2 space-y-1 text-sm">
        {netIncome !== undefined && (
          <div className="flex justify-between">
            <span>Net Income</span>
            <span className="tabular-nums">{formatMoney(netIncome)}</span>
          </div>
        )}
        {adjustments.map((ln) => (
          <div key={ln.account_id} className="flex justify-between text-muted-foreground">
            <span>
              {ln.account_code} {ln.account_name}
            </span>
            <span
              className={cn(
                "tabular-nums",
                parseFloat(ln.change_amount) >= 0 ? "text-green-600" : "text-red-600",
              )}
            >
              {parseFloat(ln.change_amount) >= 0 ? "+" : ""}
              {formatMoney(ln.change_amount)}
            </span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-1 font-medium">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatMoney(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}
