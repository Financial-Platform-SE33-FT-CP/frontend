"use client";

import { Button } from "@/components/ui/button";
import { canIssueCreditNoteOnInvoice, type Invoice } from "@/lib/ar-ap-api";

type IssueCreditNoteButtonProps = {
  invoice: Invoice;
  canIssue: boolean;
  remainingCreditable: number;
  onClick: () => void;
  disabled?: boolean;
};

export function IssueCreditNoteButton({
  invoice,
  canIssue,
  remainingCreditable,
  onClick,
  disabled,
}: IssueCreditNoteButtonProps) {
  if (!canIssue || !canIssueCreditNoteOnInvoice(invoice, remainingCreditable)) {
    return null;
  }

  return (
    <Button type="button" variant="secondary" onClick={onClick} disabled={disabled}>
      Issue credit note
    </Button>
  );
}
