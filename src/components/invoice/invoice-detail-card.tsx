"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/invoice/invoice-status-badge";
import { ConfirmDialog } from "@/components/invoice/confirm-dialog";
import {
  issueInvoice,
  isDraftInvoice,
  isPostedInvoice,
  INVOICE_PDF_AVAILABLE,
  downloadInvoicePdf,
  type Invoice,
  type Customer,
} from "@/lib/ar-ap-api";
import { listCoaAccounts, type CoaAccount } from "@/lib/coa-api";
import { formatApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format-money";
import { useEffect } from "react";

type Props = {
  invoice: Invoice;
  customer: Customer | undefined;
  canEdit: boolean;
  onUpdated?: () => void;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InvoiceDetailCard({
  invoice,
  customer,
  canEdit,
  onUpdated,
}: Props) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<CoaAccount[]>([]);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const draft = isDraftInvoice(invoice);
  const posted = isPostedInvoice(invoice);

  useEffect(() => {
    listCoaAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]));
  }, []);

  const accountLabel = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} - ${a.name}` : id.slice(0, 8) + "…";
  };

  async function handleIssue() {
    setIssuing(true);
    try {
      const issued = await issueInvoice(invoice.id);
      toast.success(
        issued.invoice_number
          ? `Invoice ${issued.invoice_number} issued.`
          : "Invoice issued.",
      );
      setIssueOpen(false);
      onUpdated?.();
      router.push(`/invoices/${issued.id}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setIssuing(false);
    }
  }

  async function handlePdf() {
    setPdfLoading(true);
    try {
      const blob = await downloadInvoicePdf(invoice.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoice_number || invoice.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : formatApiError(err));
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {draft && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
          role="alert"
        >
          This invoice has not been posted to the ledger yet.
        </div>
      )}
      {posted && (
        <div
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-100"
          role="status"
        >
          This invoice has been posted to the ledger. Corrections must be made using
          a credit note.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">
              {invoice.invoice_number || "Draft invoice"}
            </CardTitle>
            <CardDescription className="mt-1">
              {customer?.name ?? "Customer"}
              {customer?.email ? ` · ${customer.email}` : ""}
            </CardDescription>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Issue date</dt>
              <dd className="font-medium">{formatDate(invoice.issue_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Due date</dt>
              <dd className="font-medium">{formatDate(invoice.due_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">{formatDateTime(invoice.created_at)}</dd>
            </div>
            {invoice.journal_entry_id && (
              <div>
                <dt className="text-muted-foreground">Journal entry</dt>
                <dd className="font-mono text-xs break-all">
                  <Link
                    href="/journal-entries"
                    className="text-primary underline-offset-4 hover:underline"
                    title="View journal entries list"
                  >
                    {invoice.journal_entry_id}
                  </Link>
                </dd>
              </div>
            )}
          </dl>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Description</th>
                  <th className="pb-2 px-4 font-medium">Account</th>
                  <th className="pb-2 px-4 font-medium text-right">Qty</th>
                  <th className="pb-2 px-4 font-medium text-right">Unit price</th>
                  <th className="pb-2 px-4 font-medium text-right">GST rate</th>
                  <th className="pb-2 px-4 font-medium text-right">Subtotal</th>
                  <th className="pb-2 px-4 font-medium text-right">GST</th>
                  <th className="pb-2 pl-4 font-medium text-right">Line total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => {
                  const gross =
                    Number(line.line_total) + Number(line.gst_amount);
                  return (
                    <tr key={line.id} className="border-b border-muted">
                      <td className="py-3 pr-4">{line.description || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {accountLabel(line.account_id)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{line.quantity}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatMoney(line.unit_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {(Number(line.gst_rate) * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatMoney(line.line_total)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatMoney(line.gst_amount)}
                      </td>
                      <td className="py-3 pl-4 text-right font-mono">
                        {formatMoney(gross)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{formatMoney(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST</span>
              <span className="font-mono">{formatMoney(invoice.gst_amount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span className="font-mono">{formatMoney(invoice.total)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t pt-4">
            <Button variant="outline" asChild>
              <Link href="/invoices">Back to list</Link>
            </Button>
            {canEdit && draft && (
              <>
                <Button asChild>
                  <Link href={`/invoices/${invoice.id}/edit`}>Edit draft</Link>
                </Button>
                <Button variant="secondary" onClick={() => setIssueOpen(true)}>
                  Issue invoice
                </Button>
              </>
            )}
            {INVOICE_PDF_AVAILABLE && !draft && (
              <Button variant="outline" onClick={handlePdf} disabled={pdfLoading}>
                {pdfLoading ? "Generating PDF…" : "Download PDF"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={issueOpen}
        title="Issue invoice?"
        description="This will post the invoice to the ledger and assign an invoice number."
        confirmLabel="Issue invoice"
        destructive
        loading={issuing}
        onCancel={() => setIssueOpen(false)}
        onConfirm={handleIssue}
      />
    </div>
  );
}
