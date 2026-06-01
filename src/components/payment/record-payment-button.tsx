"use client";

import { Button } from "@/components/ui/button";
import { canRecordPaymentOnInvoice, type Invoice } from "@/lib/ar-ap-api";

type RecordPaymentButtonProps = {
  invoice: Invoice;
  canRecord: boolean;
  onClick: () => void;
  disabled?: boolean;
};

export function RecordPaymentButton({
  invoice,
  canRecord,
  onClick,
  disabled,
}: RecordPaymentButtonProps) {
  if (!canRecord || !canRecordPaymentOnInvoice(invoice)) {
    return null;
  }

  return (
    <Button type="button" onClick={onClick} disabled={disabled}>
      Record payment
    </Button>
  );
}
