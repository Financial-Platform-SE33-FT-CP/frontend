"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import InvoiceForm from "@/components/invoice/invoice-form";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { canEditAccountingData } from "@/lib/tenant-roles";

export default function NewInvoicePage() {
  const role = useWorkspaceRole();
  const canEdit = canEditAccountingData(role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create invoice</h1>
          <p className="mt-2 text-muted-foreground">
            Build a draft invoice with line items, then save or issue when ready.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/invoices">Back to list</Link>
        </Button>
      </div>

      <RoleGate
        allow={canEdit}
        fallback={
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            You need Owner or Accountant access to create invoices.
          </div>
        }
      >
        <InvoiceForm mode="create" canEdit={canEdit} />
      </RoleGate>
    </div>
  );
}
