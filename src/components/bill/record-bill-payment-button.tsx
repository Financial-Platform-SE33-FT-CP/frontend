"use client";

import { Button } from "@/components/ui/button";
import { canPayBill, type Bill } from "@/lib/ar-ap-api";

type Props = {
  bill: Bill;
  canRecord: boolean;
  onClick: () => void;
};

export function RecordBillPaymentButton({ bill, canRecord, onClick }: Props) {
  if (!canRecord || !canPayBill(bill)) return null;
  return (
    <Button type="button" onClick={onClick}>
      Pay bill
    </Button>
  );
}
