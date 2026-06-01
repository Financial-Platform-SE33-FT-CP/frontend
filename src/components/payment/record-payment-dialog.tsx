"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DepositAccountSelect } from "@/components/payment/deposit-account-select";
import { PaymentMethodSelect } from "@/components/payment/payment-method-select";
import {
  recordPayment,
  type CreatePaymentRequest,
  type Customer,
  type Invoice,
  type PaymentMethod,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format-money";
import {
  validatePaymentAmount,
  type PaymentSummaryDisplay,
} from "@/lib/payment-calc";

type RecordPaymentDialogProps = {
  open: boolean;
  invoice: Invoice;
  customer: Customer | undefined;
  summary: PaymentSummaryDisplay;
  onCancel: () => void;
  onSuccess: () => void;
};

export function RecordPaymentDialog({
  open,
  invoice,
  customer,
  summary,
  onCancel,
  onSuccess,
}: RecordPaymentDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [paymentDate, setPaymentDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [depositAccountId, setDepositAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const maxAmount = summary.outstanding;

  useEffect(() => {
    if (!open) return;
    setPaymentDate(today);
    setAmount(maxAmount > 0 ? maxAmount.toFixed(2) : "");
    setPaymentMethod("bank_transfer");
    setReference("");
    setDepositAccountId("");
    setFormError(null);
  }, [open, maxAmount, today]);

  const amountValidation = useMemo(
    () => validatePaymentAmount(amount, maxAmount),
    [amount, maxAmount],
  );

  if (!open) return null;

  function validateForm(): string | null {
    if (!paymentDate.trim()) return "Payment date is required.";
    if (!paymentMethod) return "Payment method is required.";
    if (!depositAccountId) return "Deposit account is required.";
    if (!amountValidation.ok) return amountValidation.message;
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
      const payload: CreatePaymentRequest = {
        payment_date: paymentDate,
        amount: amount.trim(),
        payment_method: paymentMethod,
        reference: reference.trim() || null,
        deposit_account_id: depositAccountId,
      };
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : undefined;
      await recordPayment(invoice.id, payload, { idempotencyKey });
      onSuccess();
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
      aria-labelledby="record-payment-title"
    >
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-lg">
        <CardHeader>
          <CardTitle id="record-payment-title">Record payment</CardTitle>
          <CardDescription>
            {invoice.invoice_number || "Invoice"} · {customer?.name ?? "Customer"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-md border bg-muted/30 p-3 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Invoice total</dt>
                <dd className="font-mono font-medium">
                  {formatMoney(summary.invoiceTotal)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Already paid</dt>
                <dd className="font-mono font-medium">
                  {formatMoney(summary.amountPaid)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Outstanding balance</dt>
                <dd className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                  {formatMoney(summary.outstanding)}
                </dd>
              </div>
              <div className="sm:col-span-2 text-xs text-muted-foreground">
                Maximum payment: {formatMoney(maxAmount)}
              </div>
            </dl>
          </div>

          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-2">
              <label htmlFor="payment-date" className="text-sm font-medium">
                Payment date
              </label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                disabled={submitting}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="payment-amount" className="text-sm font-medium">
                Amount
              </label>
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={maxAmount > 0 ? maxAmount : undefined}
                value={amount}
                disabled={submitting || maxAmount <= 0}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              {!amountValidation.ok && amount.trim() ? (
                <p className="text-xs text-destructive">{amountValidation.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="payment-method" className="text-sm font-medium">
                Payment method
              </label>
              <PaymentMethodSelect
                id="payment-method"
                value={paymentMethod}
                disabled={submitting}
                onChange={setPaymentMethod}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="payment-reference" className="text-sm font-medium">
                Reference <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="payment-reference"
                value={reference}
                disabled={submitting}
                placeholder="e.g. BANK-REF-001"
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="deposit-account" className="text-sm font-medium">
                Deposit account (bank / cash)
              </label>
              <DepositAccountSelect
                id="deposit-account"
                value={depositAccountId}
                disabled={submitting}
                onChange={setDepositAccountId}
              />
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
              <Button type="submit" disabled={submitting || maxAmount <= 0}>
                {submitting ? "Recording…" : "Record payment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
