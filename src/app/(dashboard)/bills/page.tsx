"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import BillListTable from "@/components/bill/bill-list-table";
import { ApAgingTable } from "@/components/bill/ap-aging-table";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { canEditAccountingData, canViewTenant } from "@/lib/tenant-roles";
import {
  listBills,
  listVendors,
  getApAging,
  type Bill,
  type Vendor,
  type APAgingLine,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";

export default function BillsPage() {
  const role = useWorkspaceRole();
  const canEdit = canEditAccountingData(role);
  const canView = canViewTenant(role);
  const [bills, setBills] = useState<Bill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [aging, setAging] = useState<APAgingLine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, v, a] = await Promise.all([listBills(), listVendors(), getApAging()]);
      setBills(b);
      setVendors(v);
      setAging(a);
    } catch (err) {
      toast.error(formatApiError(err));
      setBills([]);
      setVendors([]);
      setAging([]);
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
          <h1 className="text-3xl font-bold tracking-tight">Bills (Accounts Payable)</h1>
          <p className="mt-2 text-muted-foreground">
            Record vendor bills and pay them against accounts payable.
          </p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href="/bills/new">Record bill</Link>
          </Button>
        )}
      </div>

      <RoleGate
        allow={canView}
        fallback={
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Select a company on the Tenants page to view bills.
          </div>
        }
      >
        <BillListTable bills={bills} vendors={vendors} loading={loading} canEdit={canEdit} onRefresh={load} />
        <ApAgingTable lines={aging} vendors={vendors} loading={loading} />
      </RoleGate>
    </div>
  );
}
