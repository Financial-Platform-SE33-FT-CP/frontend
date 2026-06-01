import { describe, expect, it } from "vitest";
import {
  calcInvoiceTotalsPreview,
  calcLinePreview,
  roundMoney,
} from "./invoice-calc";

describe("calcLinePreview", () => {
  it("computes line subtotal, GST, and gross", () => {
    const result = calcLinePreview({
      quantity: "10",
      unit_price: "100",
      gst_rate: "0.09",
    });
    expect(result.line_total).toBe(1000);
    expect(result.gst_amount).toBe(90);
    expect(result.line_gross).toBe(1090);
  });
});

describe("calcInvoiceTotalsPreview", () => {
  it("sums multiple lines", () => {
    const totals = calcInvoiceTotalsPreview([
      { quantity: "10", unit_price: "100", gst_rate: "0.09" },
      { quantity: "2", unit_price: "50", gst_rate: "0" },
    ]);
    expect(totals.subtotal).toBe(1100);
    expect(totals.gst_amount).toBe(90);
    expect(totals.total).toBe(1190);
  });
});

describe("roundMoney", () => {
  it("rounds to two decimal places", () => {
    expect(roundMoney(10.005)).toBe(10.01);
  });
});
