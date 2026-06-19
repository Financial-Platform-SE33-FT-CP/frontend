"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import BillDetailCard from "@/components/bill/bill-detail-card";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { canEditAccountingData, canViewTenant } from "@/lib/tenant-roles";
import { getBill, listVendors, type Bill, type Vendor } from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";

export default function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useWorkspaceRole();
  const canEdit = canEditAccountingData(role);
  const canView = canViewTenant(role);
  const [bill, setBill] = useState<Bill | null>(null);
  const [vendor, setVendor] = useState<Vendor | undefined>();

  const load = useCallback(async () => {
    try {
      const [b, vendors] = await Promise.all([getBill(id), listVendors()]);
      setBill(b);
      setVendor(vendors.find((v) => v.id === b.vendor_id));
    } catch (err) {
      toast.error(formatApiError(err));
      setBill(null);
    }
  }, [id]);

  useEffect(() => {
    if (canView) load();
  }, [canView, load]);

  return (
    <RoleGate
      allow={canView && !!bill}
      fallback={
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {canView ? "Loading bill…" : "Select a company to view bills."}
        </div>
      }
    >
      {bill && (
        <BillDetailCard bill={bill} vendor={vendor} canEdit={canEdit} onUpdated={load} />
      )}
    </RoleGate>
  );
}
