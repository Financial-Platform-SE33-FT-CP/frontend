"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import InvoiceListTable from "@/components/invoice/invoice-list-table";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { canEditAccountingData, canViewTenant } from "@/lib/tenant-roles";
import {
  listInvoices,
  listCustomers,
  type Invoice,
  type Customer,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";

export default function InvoicesPage() {
  const role = useWorkspaceRole();
  const canEdit = canEditAccountingData(role);
  const canView = canViewTenant(role);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, cust] = await Promise.all([listInvoices(), listCustomers()]);
      setInvoices(inv);
      setCustomers(cust);
    } catch (err) {
      toast.error(formatApiError(err));
      setInvoices([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) load();
  }, [canView, load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="mt-2 text-muted-foreground">
            <strong>Viewer</strong> can view invoices only. <strong>Owner</strong> and{" "}
            <strong>Accountant</strong> can create drafts, edit drafts, and issue invoices.
          </p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href="/invoices/new">Create invoice</Link>
          </Button>
        )}
      </div>

      <RoleGate
        allow={canView}
        fallback={
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Select a company on the Tenants page to view invoices.
          </div>
        }
      >
        <InvoiceListTable
          invoices={invoices}
          customers={customers}
          loading={loading}
          canEdit={canEdit}
          onRefresh={load}
        />
      </RoleGate>
    </div>
  );
}
