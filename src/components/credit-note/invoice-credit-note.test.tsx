import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { IssueCreditNoteButton } from "@/components/credit-note/issue-credit-note-button";
import { CreditNoteHistoryTable } from "@/components/credit-note/credit-note-history-table";
import { canIssueCreditNoteOnInvoice, type Invoice } from "@/lib/ar-ap-api";
import { canEditAccountingData } from "@/lib/tenant-roles";
import { validateCreditNoteTotal } from "@/lib/credit-note-calc";
import { calcInvoiceTotalsPreview, calcLinePreview } from "@/lib/invoice-calc";

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
    lines: [
      {
        id: "line-1",
        account_id: "acc-1",
        gst_code_id: "gst-output-code",
        description: "Consulting",
        quantity: "1",
        unit_price: "300",
        gst_rate: "0.09",
        line_total: "300",
        gst_amount: "27",
      },
    ],
  };
}

describe("canIssueCreditNoteOnInvoice", () => {
  it("allows issued, partial, paid, and overdue", () => {
    expect(canIssueCreditNoteOnInvoice(invoice("issued"), 218)).toBe(true);
    expect(canIssueCreditNoteOnInvoice(invoice("partial"), 218)).toBe(true);
    expect(canIssueCreditNoteOnInvoice(invoice("paid"), 218)).toBe(true);
    expect(canIssueCreditNoteOnInvoice(invoice("overdue"), 218)).toBe(true);
  });

  it("disallows draft", () => {
    expect(canIssueCreditNoteOnInvoice(invoice("draft"), 327)).toBe(false);
  });

  it("disallows when fully credited", () => {
    expect(canIssueCreditNoteOnInvoice(invoice("issued"), 0)).toBe(false);
  });
});

describe("IssueCreditNoteButton", () => {
  it("shows for issued invoice when user can issue", () => {
    render(
      <IssueCreditNoteButton
        invoice={invoice("issued")}
        canIssue={true}
        remainingCreditable={218}
        onClick={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /issue credit note/i }),
    ).toBeInTheDocument();
  });

  it("shows for partial invoice", () => {
    render(
      <IssueCreditNoteButton
        invoice={invoice("partial")}
        canIssue={true}
        remainingCreditable={218}
        onClick={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /issue credit note/i }),
    ).toBeInTheDocument();
  });

  it("shows for paid invoice", () => {
    render(
      <IssueCreditNoteButton
        invoice={invoice("paid")}
        canIssue={true}
        remainingCreditable={218}
        onClick={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /issue credit note/i }),
    ).toBeInTheDocument();
  });

  it("hides for draft invoice", () => {
    render(
      <IssueCreditNoteButton
        invoice={invoice("draft")}
        canIssue={true}
        remainingCreditable={327}
        onClick={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /issue credit note/i }),
    ).not.toBeInTheDocument();
  });

  it("hides for viewer (canIssue false)", () => {
    render(
      <IssueCreditNoteButton
        invoice={invoice("issued")}
        canIssue={false}
        remainingCreditable={218}
        onClick={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /issue credit note/i }),
    ).not.toBeInTheDocument();
  });

  it("hides when fully credited", () => {
    render(
      <IssueCreditNoteButton
        invoice={invoice("issued")}
        canIssue={true}
        remainingCreditable={0}
        onClick={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /issue credit note/i }),
    ).not.toBeInTheDocument();
  });
});

describe("credit note RBAC", () => {
  it("viewer cannot edit accounting data", () => {
    expect(canEditAccountingData("viewer")).toBe(false);
  });
});

describe("credit note line totals", () => {
  it("updates when quantity, price, or GST rate changes", () => {
    const line = calcLinePreview({
      quantity: "2",
      unit_price: "50",
      gst_rate: "0.09",
    });
    expect(line.line_total).toBe(100);
    expect(line.gst_amount).toBe(9);
    expect(line.line_gross).toBe(109);

    const totals = calcInvoiceTotalsPreview([
      { quantity: "2", unit_price: "50", gst_rate: "0.09" },
    ]);
    expect(totals.total).toBe(109);
  });
});

describe("validateCreditNoteTotal", () => {
  it("blocks over remaining creditable amount", () => {
    const r = validateCreditNoteTotal(300, 218);
    expect(r.ok).toBe(false);
  });
});

describe("CreditNoteHistoryTable", () => {
  it("shows empty state", () => {
    render(<CreditNoteHistoryTable creditNotes={[]} />);
    expect(screen.getByText(/no credit notes issued yet/i)).toBeInTheDocument();
  });

  it("renders credit note rows", () => {
    render(
      <CreditNoteHistoryTable
        creditNotes={[
          {
            id: "cn1",
            tenant_id: null,
            invoice_id: "inv1",
            customer_id: null,
            credit_note_number: "CN-2026-0001",
            issue_date: "2026-06-01",
            reason: "Discount",
            status: "issued",
            subtotal: "100.00",
            gst_amount: "9.00",
            total: "109.00",
            journal_entry_id: "je-cn-1",
            created_by: null,
            created_at: "2026-06-01T12:00:00Z",
          },
        ]}
      />,
    );
    expect(screen.getByText("CN-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("Discount")).toBeInTheDocument();
    expect(screen.getByText("je-cn-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument();
  });
});
