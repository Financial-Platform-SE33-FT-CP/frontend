import { describe, expect, it } from "vitest";
import {
  computeBillPaymentSummary,
  validateBillPaymentAmount,
} from "@/lib/bill-payment-calc";

describe("bill-payment-calc", () => {
  it("computes outstanding from payments", () => {
    const summary = computeBillPaymentSummary(109, [
      { amount: "50" } as never,
      { amount: "9" } as never,
    ]);
    expect(summary.outstanding).toBe(50);
  });

  it("rejects overpayment", () => {
    const result = validateBillPaymentAmount("200", 109);
    expect(result.ok).toBe(false);
  });

  it("accepts partial payment", () => {
    const result = validateBillPaymentAmount("50", 109);
    expect(result.ok).toBe(true);
  });
});
