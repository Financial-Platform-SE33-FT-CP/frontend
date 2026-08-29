import { describe, expect, it } from "vitest";
import {
  computeCreditNoteSummary,
  sumCreditNoteTotals,
  validateCreditNoteTotal,
} from "@/lib/credit-note-calc";
import type { CreditNote } from "@/lib/ar-ap-api";

function creditNote(total: string): CreditNote {
  return {
    id: "cn-1",
    tenant_id: "t1",
    invoice_id: "inv-1",
    customer_id: "c1",
    credit_note_number: "CN-2026-0001",
    issue_date: "2026-06-01",
    reason: "Correction",
    status: "issued",
    subtotal: "100",
    gst_amount: "9",
    total,
    journal_entry_id: "je-cn-1",
    created_by: null,
    created_at: "2026-06-01T12:00:00Z",
  };
}

describe("sumCreditNoteTotals", () => {
  it("sums credit note totals", () => {
    expect(
      sumCreditNoteTotals([creditNote("109"), creditNote("50")]),
    ).toBe(159);
  });
});

describe("computeCreditNoteSummary", () => {
  it("derives remaining creditable amount", () => {
    const summary = computeCreditNoteSummary("327", [creditNote("109")]);
    expect(summary.invoiceTotal).toBe(327);
    expect(summary.creditNotesTotal).toBe(109);
    expect(summary.remainingCreditable).toBe(218);
  });

  it("returns zero remaining when fully credited", () => {
    const summary = computeCreditNoteSummary("327", [creditNote("327")]);
    expect(summary.remainingCreditable).toBe(0);
  });
});

describe("validateCreditNoteTotal", () => {
  it("requires total greater than zero", () => {
    expect(validateCreditNoteTotal(0, 100).ok).toBe(false);
  });

  it("blocks over remaining creditable", () => {
    const r = validateCreditNoteTotal(150, 100);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/remaining creditable/i);
  });

  it("allows valid total", () => {
    expect(validateCreditNoteTotal(100, 218).ok).toBe(true);
  });
});
