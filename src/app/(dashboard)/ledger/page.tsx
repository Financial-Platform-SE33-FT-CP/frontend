"use client";

import { useState } from "react";
import { AccountLedgerPanel } from "@/components/ledger/account-ledger-panel";
import { BalanceSheetPanel } from "@/components/ledger/balance-sheet-panel";
import { CashFlowPanel } from "@/components/ledger/cash-flow-panel";
import { ProfitLossPanel } from "@/components/ledger/profit-loss-panel";
import { TrialBalancePanel } from "@/components/ledger/trial-balance-panel";
import { RoleGate } from "@/components/tenant/role-gate";
import { useActiveTenantId } from "@/hooks/use-active-tenant";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { canViewTenant } from "@/lib/tenant-roles";
import { cn } from "@/lib/utils";

type LedgerTab = "trial-balance" | "account-ledger" | "profit-loss" | "balance-sheet" | "cash-flow";

export default function LedgerPage() {
  const tenantId = useActiveTenantId();
  const role = useWorkspaceRole();
  const canView = canViewTenant(role);

  const [tab, setTab] = useState<LedgerTab>("trial-balance");
  const [selectedAccountId, setSelectedAccountId] = useState("");

  function openAccountLedger(accountId: string) {
    setSelectedAccountId(accountId);
    setTab("account-ledger");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">General ledger</h1>
        <p className="mt-2 text-muted-foreground">
          View transactions by account with running balances, and generate a trial balance
          that must stay in balance.
        </p>
      </div>

      <RoleGate
        allow={tenantId != null && canView}
        fallback={
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            {tenantId == null
              ? "Select a company on the Tenants page before viewing the ledger."
              : "Your role does not have permission to view accounting data."}
          </div>
        }
      >
        <div className="flex flex-wrap gap-2 border-b pb-2">
          {(
            [
              ["trial-balance", "Trial balance"],
              ["account-ledger", "Account ledger"],
              ["profit-loss", "Profit & Loss"],
              ["balance-sheet", "Balance Sheet"],
              ["cash-flow", "Cash Flow"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tenantId && tab === "trial-balance" && (
          <TrialBalancePanel tenantId={tenantId} onSelectAccount={openAccountLedger} />
        )}

        {tenantId && tab === "account-ledger" && (
          <AccountLedgerPanel
            tenantId={tenantId}
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
          />
        )}

        {tenantId && tab === "profit-loss" && <ProfitLossPanel tenantId={tenantId} />}

        {tenantId && tab === "balance-sheet" && <BalanceSheetPanel tenantId={tenantId} />}

        {tenantId && tab === "cash-flow" && <CashFlowPanel tenantId={tenantId} />}
      </RoleGate>
    </div>
  );
}
