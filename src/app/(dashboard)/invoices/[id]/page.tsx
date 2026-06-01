"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import InvoiceDetailCard from "@/components/invoice/invoice-detail-card";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { canEditAccountingData, canViewTenant } from "@/lib/tenant-roles";
import {
  getInvoice,
  listCustomers,
  type Invoice,
  type Customer,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const role = useWorkspaceRole();
  const canEdit = canEditAccountingData(role);
  const canView = canViewTenant(role);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [inv, customers] = await Promise.all([
        getInvoice(id),
        listCustomers(),
      ]);
      setInvoice(inv);
      setCustomer(customers.find((c) => c.id === inv.customer_id));
    } catch (err) {
      setError(formatApiError(err));
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (canView && id) load();
  }, [canView, id, load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoice detail</h1>
        <p className="mt-2 text-muted-foreground">
          View invoice status, lines, and ledger posting information.
        </p>
      </div>

      <RoleGate
        allow={canView}
        fallback={
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Select a company on the Tenants page to view this invoice.
          </div>
        }
      >
        {loading ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Loading invoice…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center text-sm text-destructive">
            {error}
          </div>
        ) : invoice ? (
          <InvoiceDetailCard
            invoice={invoice}
            customer={customer}
            canEdit={canEdit}
            onUpdated={load}
          />
        ) : null}
      </RoleGate>
    </div>
  );
}
