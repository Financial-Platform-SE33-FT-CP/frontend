"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatAccountType, formatMoney } from "@/lib/format-money";
import { formatApiError } from "@/lib/api";
import { getTrialBalance, type TrialBalance, type TrialBalanceAccount } from "@/lib/ledger-api";
import { cn } from "@/lib/utils";

type TrialBalancePanelProps = {
  tenantId: string;
  onSelectAccount?: (accountId: string) => void;
};

export function TrialBalancePanel({ tenantId, onSelectAccount }: TrialBalancePanelProps) {
  const [asOfDate, setAsOfDate] = useState("");
  const [data, setData] = useState<TrialBalance | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const result = await getTrialBalance(asOfDate || undefined);
      setData(result);
    } catch (e) {
      setData(null);
      toast.error("Could not load trial balance", { description: formatApiError(e) });
    } finally {
      setBusy(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    void load();
  }, [load, tenantId]);

  const activeAccounts = data?.accounts.filter(hasNonZeroBalance) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trial balance</CardTitle>
        <CardDescription>
          Debit and credit balances per account. Totals should match when the books are in balance.
          {onSelectAccount ? " Click a row to open that account's ledger." : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">As of date</span>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </label>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void load()}>
            {busy ? "Loading…" : "Refresh"}
          </Button>
        </div>

        {data && (
          <>
            <div
              className={cn(
                "rounded-md border px-4 py-3 text-sm",
                data.is_balanced
                  ? "border-green-200 bg-green-50 text-green-900"
                  : "border-amber-200 bg-amber-50 text-amber-900",
              )}
            >
              {data.is_balanced ? (
                <p>
                  Trial balance is <strong>balanced</strong> — total debits{" "}
                  {formatMoney(data.total_debit_balance)} equal total credits{" "}
                  {formatMoney(data.total_credit_balance)}.
                </p>
              ) : (
                <p>
                  Trial balance is <strong>out of balance</strong> by{" "}
                  {formatMoney(data.imbalance)} (debits {formatMoney(data.total_debit_balance)} ·
                  credits {formatMoney(data.total_credit_balance)}).
                </p>
              )}
              {data.as_of_date && (
                <p className="mt-1 text-muted-foreground">As of {data.as_of_date}</p>
              )}
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Account</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 text-right font-medium">Debit bal.</th>
                    <th className="px-3 py-2 text-right font-medium">Credit bal.</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        No account activity yet. Post journal entries or import an opening balance.
                      </td>
                    </tr>
                  ) : (
                    activeAccounts.map((row) => (
                      <TrialBalanceRow
                        key={row.account_id}
                        row={row}
                        onSelectAccount={onSelectAccount}
                      />
                    ))
                  )}
                </tbody>
                {activeAccounts.length > 0 && (
                  <tfoot className="border-t bg-muted/30 font-medium">
                    <tr>
                      <td colSpan={3} className="px-3 py-2">
                        Totals
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(data.total_debit_balance)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(data.total_credit_balance)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function hasNonZeroBalance(row: TrialBalanceAccount): boolean {
  return (
    Number.parseFloat(row.debit_balance) > 0 || Number.parseFloat(row.credit_balance) > 0
  );
}

function TrialBalanceRow({
  row,
  onSelectAccount,
}: {
  row: TrialBalanceAccount;
  onSelectAccount?: (accountId: string) => void;
}) {
  const clickable = Boolean(onSelectAccount);

  return (
    <tr
      className={cn(
        "border-b last:border-0",
        clickable && "cursor-pointer hover:bg-muted/40",
      )}
      onClick={clickable ? () => onSelectAccount?.(row.account_id) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectAccount?.(row.account_id);
              }
            }
          : undefined
      }
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? "button" : undefined}
    >
      <td className="px-3 py-2 font-mono text-xs">{row.account_code}</td>
      <td className="px-3 py-2">{row.account_name}</td>
      <td className="px-3 py-2 text-muted-foreground">{formatAccountType(row.account_type)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.debit_balance)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.credit_balance)}</td>
    </tr>
  );
}
