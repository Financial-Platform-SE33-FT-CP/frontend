"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DepositAccountSelect } from "@/components/payment/deposit-account-select";
import { PaymentMethodSelect } from "@/components/payment/payment-method-select";
import {
  payBill,
  type Bill,
  type CreateBillPaymentRequest,
  type PaymentMethod,
  type Vendor,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format-money";
import {
  validateBillPaymentAmount,
  type BillPaymentSummaryDisplay,
} from "@/lib/bill-payment-calc";

type RecordBillPaymentDialogProps = {
  open: boolean;
  bill: Bill;
  vendor: Vendor | undefined;
  summary: BillPaymentSummaryDisplay;
  onCancel: () => void;
  onSuccess: () => void;
};

export function RecordBillPaymentDialog({
  open,
  bill,
  vendor,
  summary,
  onCancel,
  onSuccess,
}: RecordBillPaymentDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [paymentDate, setPaymentDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPaymentDate(today);
    setAmount(summary.outstanding > 0 ? summary.outstanding.toFixed(2) : "");
    setPaymentMethod("bank_transfer");
    setReference("");
    setPaymentAccountId("");
    setFormError(null);
  }, [open, summary.outstanding, today]);

  const amountValidation = useMemo(
    () => validateBillPaymentAmount(amount, summary.outstanding),
    [amount, summary.outstanding],
  );

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentDate) return setFormError("Payment date is required.");
    if (!paymentAccountId) return setFormError("Bank account is required.");
    if (!amountValidation.ok) return setFormError(amountValidation.message);
    setSubmitting(true);
    try {
      const payload: CreateBillPaymentRequest = {
        payment_date: paymentDate,
        amount: amount.trim(),
        payment_method: paymentMethod,
        reference: reference.trim() || null,
        payment_account_id: paymentAccountId,
      };
      const idempotencyKey = crypto.randomUUID();
      await payBill(bill.id, payload, { idempotencyKey });
      onSuccess();
    } catch (err) {
      setFormError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Pay bill</CardTitle>
          <p className="text-sm text-muted-foreground">
            {bill.bill_number} — {vendor?.name ?? "Vendor"} · Outstanding {formatMoney(summary.outstanding)}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Payment date</label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Amount</label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <PaymentMethodSelect value={paymentMethod} onChange={setPaymentMethod} />
            <div className="space-y-1">
              <label className="text-sm font-medium">Bank / cash account</label>
              <DepositAccountSelect value={paymentAccountId} onChange={setPaymentAccountId} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Reference (optional)</label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Paying…" : "Record payment"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
