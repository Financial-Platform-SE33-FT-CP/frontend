import type { CreditNote } from "@/lib/ar-ap-api";

export function sumCreditNoteTotals(creditNotes: CreditNote[]): number {
  return creditNotes.reduce((sum, cn) => sum + Number(cn.total), 0);
}

export type CreditNoteSummaryDisplay = {
  invoiceTotal: number;
  creditNotesTotal: number;
  remainingCreditable: number;
};

/** Derive creditable summary from invoice total + credit notes (display only). */
export function computeCreditNoteSummary(
  invoiceTotal: string | number,
  creditNotes: CreditNote[],
): CreditNoteSummaryDisplay {
  const total = Number(invoiceTotal);
  const credited = sumCreditNoteTotals(creditNotes);
  const remaining = Math.max(0, total - credited);
  return {
    invoiceTotal: total,
    creditNotesTotal: credited,
    remainingCreditable: remaining,
  };
}

export type ValidateCreditNoteTotalResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateCreditNoteTotal(
  total: number,
  remainingCreditable: number,
): ValidateCreditNoteTotalResult {
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, message: "Credit note total must be greater than zero." };
  }
  if (total > remainingCreditable + 0.0001) {
    return {
      ok: false,
      message: `Credit note total cannot exceed the remaining creditable amount (${remainingCreditable.toFixed(2)}).`,
    };
  }
  return { ok: true };
}
