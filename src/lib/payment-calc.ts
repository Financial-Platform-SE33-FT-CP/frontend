import type { InvoiceSettlement, Payment } from "@/lib/ar-ap-api";

export function sumPaymentAmounts(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + Number(p.amount), 0);
}

export type PaymentSummaryDisplay = {
  invoiceTotal: number;
  amountPaid: number;
  outstanding: number;
};

/** Prefer backend settlement; otherwise derive from invoice total + payments (display only). */
export function computePaymentSummary(
  invoiceTotal: string | number,
  payments: Payment[],
  settlement?: InvoiceSettlement | null,
): PaymentSummaryDisplay {
  if (settlement) {
    return {
      invoiceTotal: Number(settlement.invoice_total),
      amountPaid: Number(settlement.amount_paid),
      outstanding: Number(settlement.outstanding),
    };
  }
  const total = Number(invoiceTotal);
  const paid = sumPaymentAmounts(payments);
  const outstanding = Math.max(0, total - paid);
  return { invoiceTotal: total, amountPaid: paid, outstanding };
}

export type ValidatePaymentAmountResult =
  | { ok: true }
  | { ok: false; message: string };

export function validatePaymentAmount(
  amountRaw: string,
  outstanding: number,
): ValidatePaymentAmountResult {
  const trimmed = amountRaw.trim();
  if (!trimmed) {
    return { ok: false, message: "Amount is required." };
  }
  const amount = Number.parseFloat(trimmed);
  if (Number.isNaN(amount)) {
    return { ok: false, message: "Enter a valid amount." };
  }
  if (amount <= 0) {
    return { ok: false, message: "Amount must be greater than zero." };
  }
  if (amount > outstanding + 0.0001) {
    return {
      ok: false,
      message: `Amount cannot exceed the outstanding balance (${outstanding.toFixed(2)}).`,
    };
  }
  return { ok: true };
}
