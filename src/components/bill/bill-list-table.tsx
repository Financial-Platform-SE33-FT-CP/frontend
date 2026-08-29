"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BillStatusBadge } from "@/components/bill/bill-status-badge";
import { ConfirmDialog } from "@/components/invoice/confirm-dialog";
import {
  recordBill,
  deleteBill,
  isDraftBill,
  type Bill,
  type BillStatus,
  type Vendor,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format-money";

type Props = {
  bills: Bill[];
  vendors: Vendor[];
  loading: boolean;
  canEdit: boolean;
  onRefresh: () => void;
};

const STATUS_OPTIONS: { value: "" | BillStatus; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function BillListTable({
  bills,
  vendors,
  loading,
  canEdit,
  onRefresh,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | BillStatus>("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [recordTarget, setRecordTarget] = useState<Bill | null>(null);
  const [recording, setRecording] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState(false);

  const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));

  const filtered = bills.filter((bill) => {
    if (statusFilter && bill.status !== statusFilter) return false;
    if (vendorFilter && bill.vendor_id !== vendorFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const num = (bill.bill_number || "").toLowerCase();
      const ven = (vendorMap.get(bill.vendor_id ?? "") ?? "").toLowerCase();
      if (!num.includes(q) && !ven.includes(q)) return false;
    }
    return true;
  });

  async function confirmRecord() {
    if (!recordTarget) return;
    setRecording(true);
    try {
      const recorded = await recordBill(recordTarget.id);
      toast.success(
        recorded.bill_number
          ? `Bill ${recorded.bill_number} recorded.`
          : "Bill recorded.",
      );
      setRecordTarget(null);
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setRecording(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBill(deleteTarget.id);
      toast.success("Draft bill deleted.");
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Bills</CardTitle>
          <CardDescription>
            Vendor bills for accounts payable. Drafts can be edited; recorded
            bills are posted to the ledger.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              className="max-w-xs"
              placeholder="Search bill # or vendor"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-9 rounded-md border px-3 text-sm"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "" | BillStatus)
              }
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border px-3 text-sm"
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
            >
              <option value="">All vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Loading bills…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No bills match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Bill #</th>
                    <th className="pb-3 px-4 font-medium">Vendor</th>
                    <th className="pb-3 px-4 font-medium">Issue date</th>
                    <th className="pb-3 px-4 font-medium">Due date</th>
                    <th className="pb-3 px-4 font-medium">Status</th>
                    <th className="pb-3 px-4 font-medium text-right">Total</th>
                    <th className="pb-3 pl-4 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((bill) => {
                    const draft = isDraftBill(bill);
                    return (
                      <tr key={bill.id} className="border-b border-muted">
                        <td className="py-3 pr-4 font-medium">
                          {bill.bill_number || (
                            <span className="text-muted-foreground">Draft</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {vendorMap.get(bill.vendor_id ?? "") ?? "—"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {formatDate(bill.issue_date)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {formatDate(bill.due_date)}
                        </td>
                        <td className="py-3 px-4">
                          <BillStatusBadge status={bill.status} />
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatMoney(bill.total)}
                        </td>
                        <td className="py-3 pl-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/bills/${bill.id}`}>View</Link>
                            </Button>
                            {canEdit && draft && (
                              <>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/bills/${bill.id}/edit`}>
                                    Edit
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRecordTarget(bill)}
                                >
                                  Record
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => setDeleteTarget(bill)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={recordTarget != null}
        title="Record bill?"
        description="This posts the bill to the ledger. Continue?"
        confirmLabel="Record"
        destructive
        loading={recording}
        onCancel={() => setRecordTarget(null)}
        onConfirm={confirmRecord}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete draft bill?"
        description="This permanently removes the draft. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
