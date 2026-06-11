"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import BillForm from "@/components/bill/bill-form";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { canEditAccountingData } from "@/lib/tenant-roles";
import { getBill, isDraftBill, type Bill } from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";

export default function EditBillPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = useWorkspaceRole();
  const canEdit = canEditAccountingData(role);
  const [bill, setBill] = useState<Bill | null>(null);

  useEffect(() => {
    if (!canEdit) return;
    getBill(id)
      .then((b) => {
        if (!isDraftBill(b)) {
          toast.error("Only draft bills can be edited.");
          router.replace(`/bills/${b.id}`);
          return;
        }
        setBill(b);
      })
      .catch((err) => toast.error(formatApiError(err)));
  }, [canEdit, id, router]);

  return (
    <RoleGate
      allow={canEdit && !!bill}
      fallback={
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {canEdit ? "Loading…" : "You need Owner or Accountant role to edit bills."}
        </div>
      }
    >
      {bill && <BillForm mode="edit" billId={id} initial={bill} canEdit={canEdit} />}
    </RoleGate>
  );
}
