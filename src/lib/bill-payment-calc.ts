import type { BillPayment, BillSettlement } from "@/lib/ar-ap-api";

export type BillPaymentSummaryDisplay = {
  billTotal: number;
  amountPaid: number;
  outstanding: number;
};

export function sumBillPaymentAmounts(payments: BillPayment[]): number {
  return payments.reduce((sum, p) => sum + Number(p.amount), 0);
}

export function computeBillPaymentSummary(
  billTotal: number,
  payments: BillPayment[],
  settlement?: BillSettlement | null,
): BillPaymentSummaryDisplay {
  if (settlement) {
    return {
      billTotal: Number(settlement.bill_total),
      amountPaid: Number(settlement.amount_paid),
      outstanding: Number(settlement.outstanding),
    };
  }
  const amountPaid = sumBillPaymentAmounts(payments);
  const outstanding = Math.max(0, billTotal - amountPaid);
  return { billTotal, amountPaid, outstanding };
}

export function validateBillPaymentAmount(
  amountRaw: string,
  outstanding: number,
): { ok: boolean; message: string } {
  const trimmed = amountRaw.trim();
  if (!trimmed) return { ok: false, message: "Payment amount is required." };
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Payment amount must be greater than zero." };
  }
  if (amount > outstanding) {
    return {
      ok: false,
      message: `Payment cannot exceed outstanding balance (${outstanding.toFixed(2)}).`,
    };
  }
  return { ok: true, message: "" };
}
