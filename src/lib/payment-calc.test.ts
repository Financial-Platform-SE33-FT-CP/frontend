import { describe, expect, it } from "vitest";
import {
  computePaymentSummary,
  sumPaymentAmounts,
  validatePaymentAmount,
} from "@/lib/payment-calc";
import type { Payment } from "@/lib/ar-ap-api";

function payment(amount: string): Payment {
  return {
    id: "p1",
    tenant_id: null,
    invoice_id: "inv1",
    customer_id: null,
    amount,
    payment_date: "2026-06-01",
    payment_method: "bank_transfer",
    reference: null,
    deposit_account_id: null,
    journal_entry_id: null,
    created_by: null,
    created_at: "2026-06-01T10:00:00Z",
  };
}

describe("payment-calc", () => {
  it("sums payment amounts", () => {
    expect(sumPaymentAmounts([payment("100"), payment("27")])).toBe(127);
  });

  it("uses backend settlement when provided", () => {
    const summary = computePaymentSummary(
      "327",
      [payment("100")],
      {
        invoice_id: "inv1",
        invoice_total: "327",
        amount_paid: "100",
        outstanding: "227",
      },
    );
    expect(summary.outstanding).toBe(227);
    expect(summary.amountPaid).toBe(100);
  });

  it("computes outstanding from payments when settlement missing", () => {
    const summary = computePaymentSummary("327", [payment("100")], null);
    expect(summary.outstanding).toBe(227);
  });

  it("rejects amount over outstanding", () => {
    const result = validatePaymentAmount("400", 227);
    expect(result.ok).toBe(false);
  });

  it("accepts valid partial amount", () => {
    const result = validatePaymentAmount("100", 227);
    expect(result.ok).toBe(true);
  });
});
