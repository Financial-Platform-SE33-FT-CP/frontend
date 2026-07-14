"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BillStatusBadge } from "@/components/bill/bill-status-badge";
import { RecordBillPaymentButton } from "@/components/bill/record-bill-payment-button";
import { RecordBillPaymentDialog } from "@/components/bill/record-bill-payment-dialog";
import {
  getBillSettlement,
  listBillPayments,
  type Bill,
  type BillPayment,
  type Vendor,
  isPostedBill,
} from "@/lib/ar-ap-api";
import { listCoaAccounts } from "@/lib/coa-api";
import { formatApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format-money";
import { computeBillPaymentSummary } from "@/lib/bill-payment-calc";

type Props = {
  bill: Bill;
  vendor: Vendor | undefined;
  canEdit: boolean;
  onUpdated: () => void;
};

export default function BillDetailCard({
  bill,
  vendor,
  canEdit,
  onUpdated,
}: Props) {
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [summary, setSummary] = useState(
    computeBillPaymentSummary(Number(bill.total), []),
  );
  const [accountLabels, setAccountLabels] = useState<Record<string, string>>(
    {},
  );
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!isPostedBill(bill)) return;
    try {
      const [pays, settle] = await Promise.all([
        listBillPayments(bill.id),
        getBillSettlement(bill.id),
      ]);
      setPayments(pays);
      setSummary(computeBillPaymentSummary(Number(bill.total), pays, settle));
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }, [bill]);

  useEffect(() => {
    void loadPayments();
    listCoaAccounts()
      .then((accounts) => {
        const map: Record<string, string> = {};
        for (const a of accounts) map[a.id] = `${a.code} — ${a.name}`;
        setAccountLabels(map);
      })
      .catch(() => setAccountLabels({}));
  }, [loadPayments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {bill.bill_number || "Draft bill"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {vendor?.name ?? "Vendor"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/bills">Back</Link>
          </Button>
          <RecordBillPaymentButton
            bill={bill}
            canRecord={canEdit}
            onClick={() => setPaymentDialogOpen(true)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bill details</CardTitle>
          <BillStatusBadge status={bill.status} />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Bill date</p>
            <p>{bill.issue_date ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due date</p>
            <p>{bill.due_date ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p>{formatMoney(bill.subtotal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">GST input</p>
            <p>{formatMoney(bill.gst_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-semibold">{formatMoney(bill.total)}</p>
          </div>
          {isPostedBill(bill) && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p>{formatMoney(summary.amountPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="font-semibold">
                  {formatMoney(summary.outstanding)}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Description</th>
                <th className="py-2">Account</th>
                <th className="py-2 text-right">Net</th>
                <th className="py-2 text-right">GST</th>
              </tr>
            </thead>
            <tbody>
              {bill.lines.map((line) => (
                <tr key={line.id} className="border-b">
                  <td className="py-2">{line.description ?? "—"}</td>
                  <td className="py-2">
                    {accountLabels[line.account_id] ?? line.account_id}
                  </td>
                  <td className="py-2 text-right">
                    {formatMoney(line.line_total)}
                  </td>
                  <td className="py-2 text-right">
                    {formatMoney(line.gst_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {isPostedBill(bill) && payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Date</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2">{p.payment_date ?? "—"}</td>
                    <td className="py-2">{formatMoney(p.amount)}</td>
                    <td className="py-2">{p.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <RecordBillPaymentDialog
        open={paymentDialogOpen}
        bill={bill}
        vendor={vendor}
        summary={summary}
        onCancel={() => setPaymentDialogOpen(false)}
        onSuccess={() => {
          setPaymentDialogOpen(false);
          toast.success("Payment recorded.");
          onUpdated();
        }}
      />
    </div>
  );
}
