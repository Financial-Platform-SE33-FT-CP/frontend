"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RevenueAccountPicker } from "@/components/invoice/revenue-account-picker";
import { GstCodeSelect } from "@/components/gst/gst-code-select";
import {
  issueCreditNote,
  listGstCodes,
  type GstCode,
  type CreateCreditNoteRequest,
  type CreditNoteLineRequest,
  type Customer,
  type Invoice,
  type InvoiceLine,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";
import {
  validateCreditNoteTotal,
  type CreditNoteSummaryDisplay,
} from "@/lib/credit-note-calc";
import {
  calcInvoiceTotalsPreview,
  calcLinePreview,
  normalizeGstRateDecimal,
  type LineCalcInput,
} from "@/lib/invoice-calc";
import { formatMoney } from "@/lib/format-money";

export type CreditNoteFormLine = {
  key: number;
  invoice_line_id: string;
  description: string;
  account_id: string;
  quantity: string;
  unit_price: string;
  gst_code_id: string;
  gst_rate: string;
};

function newLine(key: number): CreditNoteFormLine {
  return {
    key,
    invoice_line_id: "",
    description: "",
    account_id: "",
    quantity: "1",
    unit_price: "",
    gst_code_id: "",
    gst_rate: "0",
  };
}

function lineFromInvoice(
  key: number,
  invoiceLine: InvoiceLine,
): CreditNoteFormLine {
  return {
    key,
    invoice_line_id: invoiceLine.id,
    description: invoiceLine.description ?? "",
    account_id: invoiceLine.account_id,
    quantity: String(invoiceLine.quantity),
    unit_price: String(invoiceLine.unit_price),
    gst_code_id: invoiceLine.gst_code_id ?? "",
    gst_rate: normalizeGstRateDecimal(
      invoiceLine.gst_rate,
      invoiceLine.line_total,
      invoiceLine.gst_amount,
    ),
  };
}

function linesToPayload(lines: CreditNoteFormLine[]): CreditNoteLineRequest[] {
  return lines.map((line) => ({
    account_id: line.account_id,
    quantity: line.quantity,
    unit_price: line.unit_price,
    description: line.description.trim() || null,
    gst_code_id: line.gst_code_id || null,
    gst_rate: line.gst_rate || "0",
    invoice_line_id: line.invoice_line_id || null,
  }));
}

type IssueCreditNoteDialogProps = {
  open: boolean;
  invoice: Invoice;
  customer: Customer | undefined;
  summary: CreditNoteSummaryDisplay;
  onCancel: () => void;
  onSuccess: (creditNoteNumber: string) => void;
};

export function IssueCreditNoteDialog({
  open,
  invoice,
  customer,
  summary,
  onCancel,
  onSuccess,
}: IssueCreditNoteDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [issueDate, setIssueDate] = useState(today);
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<CreditNoteFormLine[]>([newLine(0)]);
  const [nextKey, setNextKey] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [gstCodes, setGstCodes] = useState<GstCode[]>([]);

  useEffect(() => {
    void listGstCodes()
      .then(setGstCodes)
      .catch((error) => {
        setFormError(formatApiError(error));
      });
  }, []);

  const maxAmount = summary.remainingCreditable;

  useEffect(() => {
    if (!open) return;
    setIssueDate(today);
    setReason("");
    setLines(
      invoice.lines.length > 0
        ? [lineFromInvoice(0, invoice.lines[0])]
        : [newLine(0)],
    );
    setNextKey(invoice.lines.length > 0 ? 1 : 1);
    setFormError(null);
  }, [open, today, invoice.lines]);

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

  const totalValidation = useMemo(
    () => validateCreditNoteTotal(previewTotals.total, maxAmount),
    [previewTotals.total, maxAmount],
  );

  if (!open) return null;

  function updateLine(
    key: number,
    field: keyof CreditNoteFormLine,
    value: string,
  ) {
    setLines((prev) =>
      prev.map((line) =>
        line.key === key ? { ...line, [field]: value } : line,
      ),
    );
  }

  function selectInvoiceLine(key: number, invoiceLineId: string) {
    const invoiceLine = invoice.lines.find((l) => l.id === invoiceLineId);
    if (!invoiceLine) {
      updateLine(key, "invoice_line_id", "");
      return;
    }
    setLines((prev) =>
      prev.map((line) =>
        line.key === key ? lineFromInvoice(line.key, invoiceLine) : line,
      ),
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

  function validateForm(): string | null {
    if (!issueDate.trim()) return "Issue date is required.";
    if (!reason.trim()) return "Reason is required.";
    if (lines.length < 1) return "At least one line is required.";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const n = i + 1;
      if (!line.description.trim())
        return `Line ${n}: description is required.`;
      if (!line.account_id) return `Line ${n}: revenue account is required.`;
      const qty = Number.parseFloat(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return `Line ${n}: quantity must be greater than 0.`;
      }
      const price = Number.parseFloat(line.unit_price);
      if (!Number.isFinite(price) || price < 0) {
        return `Line ${n}: unit price must be 0 or greater.`;
      }
      const gst = Number.parseFloat(line.gst_rate);
      if (!Number.isFinite(gst) || gst < 0) {
        return `Line ${n}: GST rate must be 0 or greater.`;
      }
      if (gst > 0 && !line.gst_code_id) {
        return `Line ${n}: GST code is required when GST applies.`;
      }
    }

    if (!totalValidation.ok) return totalValidation.message;
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const payload: CreateCreditNoteRequest = {
        issue_date: issueDate,
        reason: reason.trim(),
        lines: linesToPayload(lines),
      };
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : undefined;
      const result = await issueCreditNote(invoice.id, payload, {
        idempotencyKey,
      });
      onSuccess(result.credit_note_number);
    } catch (apiErr) {
      setFormError(formatApiError(apiErr));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-credit-note-title"
    >
      <Card className="max-h-[90vh] w-full max-w-4xl overflow-y-auto shadow-lg">
        <CardHeader>
          <CardTitle id="issue-credit-note-title">Issue credit note</CardTitle>
          <CardDescription>
            {invoice.invoice_number || "Invoice"} ·{" "}
            {customer?.name ?? "Customer"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-md border bg-muted/30 p-3 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">
                  Original invoice total
                </dt>
                <dd className="font-mono font-medium">
                  {formatMoney(summary.invoiceTotal)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Existing credit notes</dt>
                <dd className="font-mono font-medium">
                  {formatMoney(summary.creditNotesTotal)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  Remaining creditable amount
                </dt>
                <dd className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                  {formatMoney(summary.remainingCreditable)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  Maximum allowed credit note
                </dt>
                <dd className="font-mono font-medium">
                  {formatMoney(maxAmount)}
                </dd>
              </div>
            </dl>
          </div>

          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="cn-issue-date" className="text-sm font-medium">
                  Issue date
                </label>
                <Input
                  id="cn-issue-date"
                  type="date"
                  value={issueDate}
                  disabled={submitting}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <label htmlFor="cn-reason" className="text-sm font-medium">
                  Reason
                </label>
                <Input
                  id="cn-reason"
                  value={reason}
                  disabled={submitting}
                  placeholder="e.g. Invoice correction / customer discount"
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Line items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={addLine}
                >
                  Add line
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                      {invoice.lines.length > 0 ? (
                        <th className="px-2 py-2 font-medium">Invoice line</th>
                      ) : null}
                      <th className="min-w-40 px-2 py-2 font-medium">
                        Description
                      </th>
                      <th className="min-w-56 px-2 py-2 font-medium">
                        Revenue account
                      </th>
                      <th className="w-24 min-w-24 px-2 py-2 font-medium">
                        Qty
                      </th>
                      <th className="w-32 min-w-32 px-2 py-2 font-medium">
                        Unit price
                      </th>
                      <th className="w-56 min-w-56 px-2 py-2 font-medium">
                        GST code
                      </th>
                      <th className="px-2 py-2 font-medium text-right">
                        Subtotal
                      </th>
                      <th className="px-2 py-2 font-medium text-right">GST</th>
                      <th className="px-2 py-2 font-medium text-right">
                        Total
                      </th>
                      <th className="px-2 py-2 w-16" />
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
                        <tr
                          key={line.key}
                          className="border-b border-muted align-top"
                        >
                          {invoice.lines.length > 0 ? (
                            <td className="px-2 py-2">
                              <select
                                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                                value={line.invoice_line_id}
                                disabled={submitting}
                                onChange={(e) =>
                                  selectInvoiceLine(line.key, e.target.value)
                                }
                              >
                                <option value="">Custom line</option>
                                {invoice.lines.map((il) => (
                                  <option key={il.id} value={il.id}>
                                    {(il.description || "Line").slice(0, 40)}
                                  </option>
                                ))}
                              </select>
                            </td>
                          ) : null}
                          <td className="px-2 py-2">
                            <Input
                              placeholder="Description"
                              value={line.description}
                              disabled={submitting}
                              onChange={(e) =>
                                updateLine(
                                  line.key,
                                  "description",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <RevenueAccountPicker
                              value={line.account_id}
                              disabled={submitting}
                              onChange={(id) =>
                                updateLine(line.key, "account_id", id)
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              className="min-w-20"
                              type="number"
                              min="0"
                              step="any"
                              value={line.quantity}
                              disabled={submitting}
                              onChange={(e) =>
                                updateLine(line.key, "quantity", e.target.value)
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              className="min-w-28"
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unit_price}
                              disabled={submitting}
                              onChange={(e) =>
                                updateLine(
                                  line.key,
                                  "unit_price",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="min-w-40 space-y-1">
                              <GstCodeSelect
                                value={line.gst_code_id}
                                codes={gstCodes}
                                allowedKinds={[
                                  "output",
                                  "zero_rated",
                                  "exempt",
                                ]}
                                disabled={submitting}
                                onChange={(code) => {
                                  setLines((previous) =>
                                    previous.map((item) =>
                                      item.key === line.key
                                        ? {
                                            ...item,
                                            gst_code_id: code?.id ?? "",
                                            gst_rate: code
                                              ? String(code.rate)
                                              : "0",
                                          }
                                        : item,
                                    ),
                                  );
                                }}
                              />

                              <p className="text-xs text-muted-foreground">
                                Rate: {Number(line.gst_rate || 0) * 100}%
                              </p>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right font-mono whitespace-nowrap">
                            {formatMoney(preview.line_total)}
                          </td>
                          <td className="px-2 py-2 text-right font-mono whitespace-nowrap">
                            {formatMoney(preview.gst_amount)}
                          </td>
                          <td className="px-2 py-2 text-right font-mono whitespace-nowrap">
                            {formatMoney(preview.line_gross)}
                          </td>
                          <td className="px-2 py-2">
                            {lines.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={submitting}
                                onClick={() => removeLine(line.key)}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">
                  {formatMoney(previewTotals.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                <span className="font-mono">
                  {formatMoney(previewTotals.gst_amount)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Credit note total</span>
                <span className="font-mono">
                  {formatMoney(previewTotals.total)}
                </span>
              </div>
              {!totalValidation.ok && previewTotals.total > 0 ? (
                <p className="text-xs text-destructive">
                  {totalValidation.message}
                </p>
              ) : null}
            </div>

            {formError ? (
              <div
                className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {formError}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || maxAmount <= 0 || !totalValidation.ok}
              >
                {submitting ? "Issuing…" : "Issue credit note"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
