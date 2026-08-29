import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecordPaymentButton } from "@/components/payment/record-payment-button";
import { PaymentHistoryTable } from "@/components/payment/payment-history-table";
import {
  canRecordPaymentOnInvoice,
  type Invoice,
} from "@/lib/ar-ap-api";
import { canEditAccountingData } from "@/lib/tenant-roles";
import { validatePaymentAmount } from "@/lib/payment-calc";

function invoice(status: Invoice["status"]): Invoice {
  return {
    id: "inv-1",
    tenant_id: "t1",
    customer_id: "c1",
    invoice_number: "INV-2026-0001",
    issue_date: "2026-05-01",
    due_date: "2026-05-31",
    status,
    subtotal: "300",
    gst_amount: "27",
    total: "327",
    journal_entry_id: "je-1",
    created_by: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: null,
    lines: [],
  };
}

describe("canRecordPaymentOnInvoice", () => {
  it("allows issued and partial", () => {
    expect(canRecordPaymentOnInvoice(invoice("issued"))).toBe(true);
    expect(canRecordPaymentOnInvoice(invoice("partial"))).toBe(true);
  });

  it("disallows draft and paid", () => {
    expect(canRecordPaymentOnInvoice(invoice("draft"))).toBe(false);
    expect(canRecordPaymentOnInvoice(invoice("paid"))).toBe(false);
  });
});

describe("RecordPaymentButton", () => {
  it("shows for issued invoice when user can record", () => {
    render(
      <RecordPaymentButton
        invoice={invoice("issued")}
        canRecord={true}
        onClick={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /record payment/i })).toBeInTheDocument();
  });

  it("hides for draft invoice", () => {
    render(
      <RecordPaymentButton
        invoice={invoice("draft")}
        canRecord={true}
        onClick={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /record payment/i })).not.toBeInTheDocument();
  });

  it("hides for paid invoice", () => {
    render(
      <RecordPaymentButton
        invoice={invoice("paid")}
        canRecord={true}
        onClick={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /record payment/i })).not.toBeInTheDocument();
  });

  it("hides for viewer (canRecord false)", () => {
    render(
      <RecordPaymentButton
        invoice={invoice("issued")}
        canRecord={false}
        onClick={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /record payment/i })).not.toBeInTheDocument();
  });
});

describe("invoice payment RBAC", () => {
  it("viewer cannot edit accounting data", () => {
    expect(canEditAccountingData("viewer")).toBe(false);
  });
});

describe("validatePaymentAmount", () => {
  it("requires amount", () => {
    expect(validatePaymentAmount("", 100).ok).toBe(false);
  });

  it("blocks over outstanding", () => {
    const r = validatePaymentAmount("150", 100);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/outstanding/i);
  });
});

describe("PaymentHistoryTable", () => {
  it("shows empty state", () => {
    render(<PaymentHistoryTable payments={[]} />);
    expect(screen.getByText(/no payments recorded yet/i)).toBeInTheDocument();
  });

  it("renders payment rows", () => {
    render(
      <PaymentHistoryTable
        payments={[
          {
            id: "p1",
            tenant_id: null,
            invoice_id: "inv1",
            customer_id: null,
            amount: "100.00",
            payment_date: "2026-06-01",
            payment_method: "bank_transfer",
            reference: "REF-1",
            deposit_account_id: null,
            journal_entry_id: "je-pay-1",
            created_by: null,
            created_at: "2026-06-01T12:00:00Z",
          },
        ]}
      />,
    );
    expect(screen.getByText("REF-1")).toBeInTheDocument();
    expect(screen.getByText("je-pay-1")).toBeInTheDocument();
    expect(screen.getByText(/bank transfer/i)).toBeInTheDocument();
  });
});
