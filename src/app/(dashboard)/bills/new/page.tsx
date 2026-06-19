"use client";

import BillForm from "@/components/bill/bill-form";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { canEditAccountingData } from "@/lib/tenant-roles";

export default function NewBillPage() {
  const role = useWorkspaceRole();
  const canEdit = canEditAccountingData(role);

  return (
    <RoleGate
      allow={canEdit}
      fallback={
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          You need Owner or Accountant role to record bills.
        </div>
      }
    >
      <BillForm mode="create" canEdit={canEdit} />
    </RoleGate>
  );
}
