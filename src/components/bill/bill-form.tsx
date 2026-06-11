"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VendorSelect } from "@/components/bill/vendor-select";
import { ExpenseAccountPicker } from "@/components/bill/expense-account-picker";
import { InvoiceTotalsSummary } from "@/components/invoice/invoice-totals-summary";
import { ConfirmDialog } from "@/components/invoice/confirm-dialog";
import {
  createBill,
  updateBill,
  recordBill,
  type Bill,
  type BillLineRequest,
  type CreateBillRequest,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";
import { calcInvoiceTotalsPreview, calcLinePreview, type LineCalcInput } from "@/lib/invoice-calc";
import { formatMoney } from "@/lib/format-money";

export type BillFormLine = {
  key: number;
  description: string;
  account_id: string;
  quantity: string;
  unit_price: string;
  gst_rate: string;
};

function newLine(key: number): BillFormLine {
  return { key, description: "", account_id: "", quantity: "1", unit_price: "", gst_rate: "0.09" };
}

function linesToPayload(lines: BillFormLine[]): BillLineRequest[] {
  return lines.map((l) => ({
    account_id: l.account_id,
    quantity: l.quantity,
    unit_price: l.unit_price,
    description: l.description.trim() || null,
    gst_rate: l.gst_rate || "0",
  }));
}

function billToFormLines(bill: Bill): BillFormLine[] {
  return bill.lines.map((line, idx) => ({
    key: idx,
    description: line.description ?? "",
    account_id: line.account_id,
    quantity: String(line.quantity),
    unit_price: String(line.unit_price),
    gst_rate: String(line.gst_rate),
  }));
}

type BillFormProps = {
  mode: "create" | "edit";
  billId?: string;
  initial?: Bill;
  canEdit: boolean;
};

export default function BillForm({ mode, billId, initial, canEdit }: BillFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [vendorId, setVendorId] = useState(initial?.vendor_id ?? "");
  const [issueDate, setIssueDate] = useState(initial?.issue_date ?? today);
  const [dueDate, setDueDate] = useState(initial?.due_date ?? today);
  const [lines, setLines] = useState<BillFormLine[]>(
    initial ? billToFormLines(initial) : [newLine(0)],
  );
  const [nextKey, setNextKey] = useState(initial ? initial.lines.length : 1);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [savedBill, setSavedBill] = useState<Bill | null>(initial ?? null);

  const previewTotals = useMemo(
    () =>
      calcInvoiceTotalsPreview(
        lines.map((l) => ({
          quantity: l.quantity,
          unit_price: l.unit_price,
          gst_rate: l.gst_rate,
        })),
      ),
    [lines],
  );

  function validate(): string | null {
    if (!vendorId) return "Vendor is required.";
    if (!issueDate || !dueDate) return "Bill date and due date are required.";
    if (dueDate < issueDate) return "Due date cannot be earlier than bill date.";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const n = i + 1;
      if (!line.description.trim()) return `Line ${n}: description is required.`;
      if (!line.account_id) return `Line ${n}: expense account is required.`;
      if (!(parseFloat(line.quantity) > 0)) return `Line ${n}: quantity must be greater than 0.`;
      if (parseFloat(line.unit_price) < 0) return `Line ${n}: unit price must be 0 or greater.`;
    }
    return null;
  }

  function buildPayload(): CreateBillRequest {
    return {
      vendor_id: vendorId,
      issue_date: issueDate,
      due_date: dueDate,
      lines: linesToPayload(lines),
    };
  }

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    const err = validate();
    if (err) return toast.error(err);
    setSaving(true);
    try {
      const result =
        mode === "edit" && billId
          ? await updateBill(billId, buildPayload())
          : await createBill(buildPayload());
      setSavedBill(result);
      toast.success("Bill saved as draft.");
      if (mode === "create") router.replace(`/bills/${result.id}/edit`);
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleRecord() {
    const err = validate();
    if (err) return toast.error(err);
    setRecording(true);
    try {
      let id = billId ?? savedBill?.id;
      if (!id) {
        const draft = await createBill(buildPayload());
        id = draft.id;
        setSavedBill(draft);
      } else {
        await updateBill(id, buildPayload());
      }
      const recorded = await recordBill(id);
      toast.success(`Bill ${recorded.bill_number} recorded.`);
      setRecordDialogOpen(false);
      router.push(`/bills/${recorded.id}`);
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setRecording(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSaveDraft} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{mode === "create" ? "New bill" : "Edit draft bill"}</CardTitle>
            <CardDescription>Save as draft, then record to post Dr Expense / Dr GST Input / Cr AP.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <label className="text-sm font-medium">Vendor</label>
              <VendorSelect value={vendorId} onChange={setVendorId} disabled={!canEdit || saving || recording} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bill date</label>
              <Input type="date" value={issueDate} disabled={!canEdit} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due date</label>
              <Input type="date" value={dueDate} disabled={!canEdit} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line items</CardTitle>
            {canEdit && (
              <Button type="button" variant="outline" size="sm" onClick={() => { setLines((p) => [...p, newLine(nextKey)]); setNextKey((k) => k + 1); }}>
                Add line
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.map((line, idx) => {
              const preview = calcLinePreview(line);
              return (
                <div key={line.key} className="grid gap-3 rounded-lg border p-4 md:grid-cols-6">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-medium">Description</label>
                    <Input value={line.description} disabled={!canEdit} onChange={(e) => setLines((p) => p.map((l) => l.key === line.key ? { ...l, description: e.target.value } : l))} />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-medium">Expense account</label>
                    <ExpenseAccountPicker value={line.account_id} disabled={!canEdit} onChange={(id) => setLines((p) => p.map((l) => l.key === line.key ? { ...l, account_id: id } : l))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Qty</label>
                    <Input value={line.quantity} disabled={!canEdit} onChange={(e) => setLines((p) => p.map((l) => l.key === line.key ? { ...l, quantity: e.target.value } : l))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Unit price</label>
                    <Input value={line.unit_price} disabled={!canEdit} onChange={(e) => setLines((p) => p.map((l) => l.key === line.key ? { ...l, unit_price: e.target.value } : l))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">GST rate</label>
                    <Input value={line.gst_rate} disabled={!canEdit} onChange={(e) => setLines((p) => p.map((l) => l.key === line.key ? { ...l, gst_rate: e.target.value } : l))} />
                  </div>
                  <div className="md:col-span-6 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Line {idx + 1}: {formatMoney(preview.line_total)} + GST {formatMoney(preview.gst_amount)}</span>
                    {canEdit && lines.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setLines((p) => p.filter((l) => l.key !== line.key))}>Remove</Button>
                    )}
                  </div>
                </div>
              );
            })}
            <InvoiceTotalsSummary preview={previewTotals} />
          </CardContent>
        </Card>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving || recording}>{saving ? "Saving…" : "Save draft"}</Button>
            <Button type="button" variant="default" disabled={saving || recording} onClick={() => setRecordDialogOpen(true)}>
              Record bill
            </Button>
          </div>
        )}
      </form>

      <ConfirmDialog
        open={recordDialogOpen}
        title="Record bill?"
        description="This posts a journal entry: Debit expense & GST input, Credit accounts payable. This cannot be undone."
        confirmLabel={recording ? "Recording…" : "Record bill"}
        loading={recording}
        onCancel={() => setRecordDialogOpen(false)}
        onConfirm={() => void handleRecord()}
      />
    </>
  );
}
