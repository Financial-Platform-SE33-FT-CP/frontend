"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import InvoiceForm from "@/components/invoice/invoice-form";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { canEditAccountingData } from "@/lib/tenant-roles";
import { getInvoice, isDraftInvoice, type Invoice } from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const role = useWorkspaceRole();
  const canEdit = canEditAccountingData(role);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const inv = await getInvoice(id);
      if (!isDraftInvoice(inv)) {
        toast.error("Only draft invoices can be edited.");
        router.replace(`/invoices/${id}`);
        return;
      }
      setInvoice(inv);
    } catch (err) {
      toast.error(formatApiError(err));
      router.replace("/invoices");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (canEdit && id) load();
  }, [canEdit, id, load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit invoice</h1>
          <p className="mt-2 text-muted-foreground">
            Update draft details before issuing to the ledger.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={id ? `/invoices/${id}` : "/invoices"}>Cancel</Link>
        </Button>
      </div>

      <RoleGate
        allow={canEdit}
        fallback={
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            You need Owner or Accountant access to edit invoices.
          </div>
        }
      >
        {loading ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Loading…
          </div>
        ) : invoice ? (
          <InvoiceForm
            mode="edit"
            invoiceId={id}
            initial={invoice}
            canEdit={canEdit}
          />
        ) : null}
      </RoleGate>
    </div>
  );
}
