"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  { value: "partial", label: "Partially paid" },
  { value: "paid", label: "Paid" },
];

export default function BillListTable({ bills, vendors, loading, canEdit, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | BillStatus>("");
  const [recordTarget, setRecordTarget] = useState<Bill | null>(null);
  const [recording, setRecording] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState(false);
  const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));

  const filtered = bills.filter((bill) => {
    if (statusFilter && bill.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const num = (bill.bill_number || "").toLowerCase();
      const vendor = (vendorMap.get(bill.vendor_id ?? "") ?? "").toLowerCase();
      if (!num.includes(q) && !vendor.includes(q)) return false;
    }
    return true;
  });

  async function confirmRecord() {
    if (!recordTarget) return;
    setRecording(true);
    try {
      const recorded = await recordBill(recordTarget.id);
      toast.success(`Bill ${recorded.bill_number} recorded.`);
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
    <Card>
      <CardHeader>
        <CardTitle>Vendor bills</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search bill # or vendor" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <select className="h-9 rounded-md border px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | BillStatus)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading bills…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No bills found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Bill #</th>
                  <th className="py-2 pr-4">Vendor</th>
                  <th className="py-2 pr-4">Due</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bill) => (
                  <tr key={bill.id} className="border-b">
                    <td className="py-2 pr-4">{bill.bill_number || "—"}</td>
                    <td className="py-2 pr-4">{vendorMap.get(bill.vendor_id ?? "") ?? "—"}</td>
                    <td className="py-2 pr-4">{bill.due_date ?? "—"}</td>
                    <td className="py-2 pr-4"><BillStatusBadge status={bill.status} /></td>
                    <td className="py-2 pr-4 text-right">{formatMoney(bill.total)}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button asChild variant="outline" size="sm"><Link href={`/bills/${bill.id}`}>View</Link></Button>
                        {canEdit && isDraftBill(bill) && (
                          <>
                            <Button asChild variant="outline" size="sm"><Link href={`/bills/${bill.id}/edit`}>Edit</Link></Button>
                            <Button size="sm" onClick={() => setRecordTarget(bill)}>Record</Button>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(bill)}>Delete</Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <ConfirmDialog open={!!recordTarget} title="Record bill?" description="Posts journal entry and opens the bill for payment." confirmLabel={recording ? "Recording…" : "Record"} loading={recording} onCancel={() => setRecordTarget(null)} onConfirm={() => void confirmRecord()} />
      <ConfirmDialog open={!!deleteTarget} title="Delete draft bill?" description="This cannot be undone." confirmLabel={deleting ? "Deleting…" : "Delete"} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
    </Card>
  );
}
