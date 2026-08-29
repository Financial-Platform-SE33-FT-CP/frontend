import { describe, expect, it } from "vitest";
import { calcInvoiceTotalsPreview } from "@/lib/invoice-calc";

/** Mirrors client-side validation rules used in InvoiceForm. */
function validateInvoiceForm(input: {
  customerId: string;
  issueDate: string;
  dueDate: string;
  lines: {
    description: string;
    account_id: string;
    quantity: string;
    unit_price: string;
    gst_rate: string;
  }[];
}): string | null {
  if (!input.customerId) return "Customer is required.";
  if (!input.issueDate) return "Issue date is required.";
  if (!input.dueDate) return "Due date is required.";
  if (input.dueDate < input.issueDate) {
    return "Due date cannot be earlier than issue date.";
  }
  if (input.lines.length < 1) return "At least one invoice line is required.";

  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i];
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

describe("invoice form validation", () => {
  const valid = {
    customerId: "cust-1",
    issueDate: "2026-03-01",
    dueDate: "2026-03-31",
    lines: [
      {
        description: "Consulting",
        account_id: "acc-1",
        quantity: "1",
        unit_price: "100",
        gst_rate: "0.09",
      },
    ],
  };

  it("accepts valid payload", () => {
    expect(validateInvoiceForm(valid)).toBeNull();
  });

  it("requires customer", () => {
    expect(validateInvoiceForm({ ...valid, customerId: "" })).toMatch(
      /Customer/,
    );
  });

  it("rejects due date before issue date", () => {
    expect(
      validateInvoiceForm({
        ...valid,
        issueDate: "2026-03-10",
        dueDate: "2026-03-01",
      }),
    ).toMatch(/Due date/);
  });

  it("requires description on lines", () => {
    expect(
      validateInvoiceForm({
        ...valid,
        lines: [{ ...valid.lines[0], description: "  " }],
      }),
    ).toMatch(/description/);
  });
});

describe("invoice totals preview", () => {
  it("updates when quantity or price changes", () => {
    const a = calcInvoiceTotalsPreview([
      { quantity: "1", unit_price: "100", gst_rate: "0" },
    ]);
    const b = calcInvoiceTotalsPreview([
      { quantity: "2", unit_price: "100", gst_rate: "0" },
    ]);
    expect(b.subtotal).toBeGreaterThan(a.subtotal);
  });
});
