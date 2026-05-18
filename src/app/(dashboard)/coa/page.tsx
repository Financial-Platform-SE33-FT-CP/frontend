"use client";

import { ChartOfAccountsEditor } from "@/components/coa/chart-of-accounts-editor";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { canEditAccountingData } from "@/lib/tenant-roles";

export default function ChartOfAccountsPage() {
  const role = useWorkspaceRole();
  const canEdit = canEditAccountingData(role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
        <p className="mt-2 text-muted-foreground">
          <strong>Viewer</strong> is read-only here; <strong>Owner</strong> and{" "}
          <strong>Accountant</strong> can manage accounts when the COA service is connected.
        </p>
      </div>

      <RoleGate
        allow={role != null}
        fallback={
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Select a company on the Tenants page so your role is known for this session.
          </div>
        }
      >
        <ChartOfAccountsEditor canEdit={canEdit}/>
      </RoleGate>
    </div>
  );
}
