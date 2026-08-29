"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { useActiveTenantId } from "@/hooks/use-active-tenant";
import { canEditAccountingData } from "@/lib/tenant-roles";
import {
  listPeriods,
  closePeriod,
  type AccountingPeriod,
  type CloseFiscalYearResult,
} from "@/lib/ledger-api";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function YearEndPage() {
  const role = useWorkspaceRole();
  const activeTenantId = useActiveTenantId();
  const canEdit = Boolean(activeTenantId) && canEditAccountingData(role);

  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [result, setResult] = useState<CloseFiscalYearResult | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    try {
      const nextPeriods = await listPeriods();
      if (currentRequestId === requestId.current) setPeriods(nextPeriods);
    } catch (err) {
      if (currentRequestId === requestId.current) {
        toast.error(formatApiError(err));
        setPeriods([]);
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canEdit) {
      requestId.current += 1;
      setPeriods([]);
      setResult(null);
      setLoading(false);
      return;
    }
    setResult(null);
    void load();
  }, [activeTenantId, canEdit, load]);

  async function handleClose(periodId: string) {
    setClosingId(null);
    setConfirmText("");
    try {
      const res = await closePeriod(periodId);
      setResult(res);
      toast.success(res.message || "Fiscal year closed.");
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  const openPeriods = periods.filter((p) => !p.is_closed);
  const closedPeriods = periods.filter((p) => p.is_closed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Year-End Close</h1>
        <p className="mt-2 text-muted-foreground">
          Close a fiscal year to zero out revenue and expense accounts into
          Retained Earnings. Only <strong>Owner</strong> and{" "}
          <strong>Accountant</strong> can perform this action.
        </p>
      </div>

      <RoleGate
        allow={canEdit}
        fallback={
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Select a company on the Tenants page to manage fiscal years.
          </div>
        }
      >
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <>
            <section>
              <h2 className="mb-3 text-lg font-semibold">
                Open Periods ({openPeriods.length})
              </h2>
              {openPeriods.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                  No open accounting periods.
                </div>
              ) : (
                <div className="space-y-3">
                  {openPeriods.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <span className="font-medium">
                          {p.start_date} → {p.end_date}
                        </span>
                        <span className="ml-3 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
                          Open
                        </span>
                      </div>
                      {closingId === p.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            className="rounded-md border px-3 py-1 text-sm"
                            placeholder={`Type "close FY${p.end_date.slice(0, 4)}" to confirm`}
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                          />
                          <Button
                            size="sm"
                            disabled={
                              confirmText.toLowerCase() !==
                              `close fy${p.end_date.slice(0, 4)}`
                            }
                            onClick={() => handleClose(p.id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setClosingId(null);
                              setConfirmText("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setClosingId(p.id)}
                        >
                          Close Year
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold">
                Closed Periods ({closedPeriods.length})
              </h2>
              {closedPeriods.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                  No closed periods yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {closedPeriods.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center rounded-lg border p-4"
                    >
                      <span className="font-medium">
                        {p.start_date} → {p.end_date}
                      </span>
                      <span className="ml-3 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        Closed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {result && result.closing_journal_entry && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <h3 className="font-semibold">Last Closing Entry</h3>
                <p className="text-sm text-muted-foreground">
                  Reference: {result.closing_journal_entry.reference}
                </p>
                <p className="text-sm text-muted-foreground">
                  Description: {result.closing_journal_entry.description}
                </p>
                <p className="text-sm text-muted-foreground">
                  Lines: {result.closing_journal_entry.lines?.length ?? 0}
                </p>
              </div>
            )}
          </>
        )}
      </RoleGate>
    </div>
  );
}
