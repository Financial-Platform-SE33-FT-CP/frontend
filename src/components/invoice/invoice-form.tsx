"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CustomerSelect } from "@/components/invoice/customer-select";
import { RevenueAccountPicker } from "@/components/invoice/revenue-account-picker";
import { InvoiceTotalsSummary } from "@/components/invoice/invoice-totals-summary";
import { ConfirmDialog } from "@/components/invoice/confirm-dialog";
import {
  createInvoice,
  updateInvoice,
  issueInvoice,
  type CreateInvoiceRequest,
  type Invoice,
  type InvoiceLineRequest,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";
import {
  calcInvoiceTotalsPreview,
  calcLinePreview,
  type LineCalcInput,
} from "@/lib/invoice-calc";
import { formatMoney } from "@/lib/format-money";

export type InvoiceFormLine = {
  key: number;
  description: string;
  account_id: string;
  quantity: string;
  unit_price: string;
  gst_rate: string;
};

function newLine(key: number): InvoiceFormLine {
  return {
    key,
    description: "",
    account_id: "",
    quantity: "1",
    unit_price: "",
    gst_rate: "0.09",
  };
}

function linesToPayload(lines: InvoiceFormLine[]): InvoiceLineRequest[] {
  return lines.map((l) => ({
    account_id: l.account_id,
    quantity: l.quantity,
    unit_price: l.unit_price,
    description: l.description.trim() || null,
    gst_rate: l.gst_rate || "0",
  }));
}

function invoiceToFormLines(invoice: Invoice): InvoiceFormLine[] {
  return invoice.lines.map((line, idx) => ({
    key: idx,
    description: line.description ?? "",
    account_id: line.account_id,
    quantity: String(line.quantity),
    unit_price: String(line.unit_price),
    gst_rate: String(line.gst_rate),
  }));
}

type InvoiceFormProps = {
  mode: "create" | "edit";
  invoiceId?: string;
  initial?: Invoice;
  canEdit: boolean;
};

export default function InvoiceForm({
  mode,
  invoiceId,
  initial,
  canEdit,
}: InvoiceFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [customerId, setCustomerId] = useState(initial?.customer_id ?? "");
  const [issueDate, setIssueDate] = useState(initial?.issue_date ?? today);
  const [dueDate, setDueDate] = useState(initial?.due_date ?? today);
  const [lines, setLines] = useState<InvoiceFormLine[]>(
    initial ? invoiceToFormLines(initial) : [newLine(0)],
  );
  const [nextKey, setNextKey] = useState(
    initial ? initial.lines.length : 1,
  );
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<Invoice | null>(initial ?? null);

  const calcInputs: LineCalcInput[] = useMemo(
    () =>
      lines.map((l) => ({
        quantity: l.quantity,
        unit_price: l.unit_price,
        gst_rate: l.gst_rate,
      })),
    [lines],
  );

  const previewTotals = useMemo(
    () => calcInvoiceTotalsPreview(calcInputs),
    [calcInputs],
  );

  function updateLine(key: number, field: keyof InvoiceFormLine, value: string) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, [field]: value } : line)),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, newLine(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function removeLine(key: number) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function validate(): string | null {
    if (!customerId) return "Customer is required.";
    if (!issueDate) return "Issue date is required.";
    if (!dueDate) return "Due date is required.";
    if (dueDate < issueDate) return "Due date cannot be earlier than issue date.";
    if (lines.length < 1) return "At least one invoice line is required.";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const n = i + 1;
      if (!line.description.trim()) return `Line ${n}: description is required.`;
      if (!line.account_id) return `Line ${n}: revenue account is required.`;
      const qty = parseFloat(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return `Line ${n}: quantity must be greater than 0.`;
      }
      const price = parseFloat(line.unit_price);
      if (!Number.isFinite(price) || price < 0) {
        return `Line ${n}: unit price must be 0 or greater.`;
      }
      const gst = parseFloat(line.gst_rate);
      if (!Number.isFinite(gst) || gst < 0) {
        return `Line ${n}: GST rate must be 0 or greater.`;
      }
    }
    return null;
  }

  function buildPayload(): CreateInvoiceRequest {
    return {
      customer_id: customerId,
      issue_date: issueDate,
      due_date: dueDate,
      lines: linesToPayload(lines),
    };
  }

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const result =
        mode === "edit" && invoiceId
          ? await updateInvoice(invoiceId, payload)
          : await createInvoice(payload);
      setSavedInvoice(result);
      toast.success("Invoice saved as draft.");
      if (mode === "create") {
        router.replace(`/invoices/${result.id}/edit`);
      }
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleIssue() {
    const err = validate();
    if (err) {
      toast.error(err);
      setIssueDialogOpen(false);
      return;
    }

    setIssuing(true);
    try {
      let id = invoiceId ?? savedInvoice?.id;
      if (!id) {
        const draft = await createInvoice(buildPayload());
        id = draft.id;
        setSavedInvoice(draft);
      } else if (mode === "edit" || savedInvoice) {
        await updateInvoice(id, buildPayload());
      }
      const issued = await issueInvoice(id);
      toast.success(
        issued.invoice_number
          ? `Invoice ${issued.invoice_number} issued successfully.`
          : "Invoice issued successfully.",
      );
      setIssueDialogOpen(false);
      router.push(`/invoices/${issued.id}`);
      router.refresh();
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setIssuing(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSaveDraft} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{mode === "create" ? "New invoice" : "Edit draft invoice"}</CardTitle>
            <CardDescription>
              Save as draft first, then issue when ready to post to the ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label className="text-sm font-medium">Customer</label>
                <CustomerSelect
                  value={customerId}
                  onChange={setCustomerId}
                  disabled={!canEdit || saving || issuing}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Issue date</label>
                <Input
                  type="date"
                  value={issueDate}
                  disabled={!canEdit || saving || issuing}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due date</label>
                <Input
                  type="date"
                  value={dueDate}
                  disabled={!canEdit || saving || issuing}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Line items</CardTitle>
              <CardDescription>Revenue accounts, quantities, and GST per line.</CardDescription>
            </div>
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving || issuing}
                onClick={addLine}
              >
                Add line
              </Button>
            )}
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-2 font-medium">Description</th>
                  <th className="pb-2 px-2 font-medium">Revenue account</th>
                  <th className="pb-2 px-2 font-medium w-20">Qty</th>
                  <th className="pb-2 px-2 font-medium w-24">Unit price</th>
                  <th className="pb-2 px-2 font-medium w-20">GST rate</th>
                  <th className="pb-2 px-2 font-medium text-right">Subtotal</th>
                  <th className="pb-2 px-2 font-medium text-right">GST</th>
                  <th className="pb-2 px-2 font-medium text-right">Total</th>
                  <th className="pb-2 pl-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const preview = calcLinePreview({
                    quantity: line.quantity,
                    unit_price: line.unit_price,
                    gst_rate: line.gst_rate,
                  });
                  return (
                    <tr key={line.key} className="border-b border-muted align-top">
                      <td className="py-2 pr-2">
                        <Input
                          placeholder="Description"
                          value={line.description}
                          disabled={!canEdit || saving || issuing}
                          onChange={(e) =>
                            updateLine(line.key, "description", e.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 px-2">
                        <RevenueAccountPicker
                          value={line.account_id}
                          disabled={!canEdit || saving || issuing}
                          onChange={(id) => updateLine(line.key, "account_id", id)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={line.quantity}
                          disabled={!canEdit || saving || issuing}
                          onChange={(e) =>
                            updateLine(line.key, "quantity", e.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          disabled={!canEdit || saving || issuing}
                          onChange={(e) =>
                            updateLine(line.key, "unit_price", e.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={line.gst_rate}
                          disabled={!canEdit || saving || issuing}
                          onChange={(e) =>
                            updateLine(line.key, "gst_rate", e.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-mono whitespace-nowrap">
                        {formatMoney(preview.line_total)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono whitespace-nowrap">
                        {formatMoney(preview.gst_amount)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono whitespace-nowrap">
                        {formatMoney(preview.line_gross)}
                      </td>
                      <td className="py-2 pl-2">
                        {canEdit && lines.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={saving || issuing}
                            onClick={() => removeLine(line.key)}
                          >
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <InvoiceTotalsSummary preview={previewTotals} />
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving || issuing}>
              {saving ? "Saving…" : "Save as draft"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving || issuing}
              onClick={() => setIssueDialogOpen(true)}
            >
              Issue invoice
            </Button>
          </div>
        )}
      </form>

      <ConfirmDialog
        open={issueDialogOpen}
        title="Issue invoice?"
        description="This will post the invoice to the ledger and assign an invoice number. This action cannot be undone from this screen — use a credit note for corrections after issue."
        confirmLabel="Issue invoice"
        destructive
        loading={issuing}
        onCancel={() => setIssueDialogOpen(false)}
        onConfirm={handleIssue}
      />
    </>
  );
}
