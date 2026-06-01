"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InvoiceStatusBadge } from "@/components/invoice/invoice-status-badge";
import { ConfirmDialog } from "@/components/invoice/confirm-dialog";
import {
  issueInvoice,
  deleteInvoice,
  INVOICE_PDF_AVAILABLE,
  downloadInvoicePdf,
  isDraftInvoice,
  type Invoice,
  type InvoiceStatus,
  type Customer,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format-money";

type Props = {
  invoices: Invoice[];
  customers: Customer[];
  loading: boolean;
  canEdit: boolean;
  onRefresh: () => void;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_OPTIONS: { value: "" | InvoiceStatus; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "paid", label: "Paid" },
  { value: "partial", label: "Partial" },
  { value: "overdue", label: "Overdue" },
];

export default function InvoiceListTable({
  invoices,
  customers,
  loading,
  canEdit,
  onRefresh,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | InvoiceStatus>("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [issuedFrom, setIssuedFrom] = useState("");
  const [issuedTo, setIssuedTo] = useState("");
  const [issueTarget, setIssueTarget] = useState<Invoice | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);

  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  const filtered = invoices.filter((inv) => {
    if (statusFilter && inv.status !== statusFilter) return false;
    if (customerFilter && inv.customer_id !== customerFilter) return false;
    if (issuedFrom && inv.issue_date && inv.issue_date < issuedFrom) return false;
    if (issuedTo && inv.issue_date && inv.issue_date > issuedTo) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const num = (inv.invoice_number || "").toLowerCase();
      const cust = (customerMap.get(inv.customer_id ?? "") ?? "").toLowerCase();
      if (!num.includes(q) && !cust.includes(q)) return false;
    }
    return true;
  });

  async function confirmIssue() {
    if (!issueTarget) return;
    setIssuing(true);
    try {
      const issued = await issueInvoice(issueTarget.id);
      toast.success(
        issued.invoice_number
          ? `Invoice ${issued.invoice_number} issued.`
          : "Invoice issued.",
      );
      setIssueTarget(null);
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setIssuing(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInvoice(deleteTarget.id);
      toast.success("Draft invoice deleted.");
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handlePdf(invoice: Invoice) {
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
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            Customer invoices for accounts receivable. Drafts can be edited; issued
            invoices are posted to the ledger.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              className="max-w-xs"
              placeholder="Search invoice # or customer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-9 rounded-md border px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "" | InvoiceStatus)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border px-3 text-sm"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            >
              <option value="">All customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              type="date"
              className="w-40"
              value={issuedFrom}
              onChange={(e) => setIssuedFrom(e.target.value)}
              title="Issued from"
            />
            <Input
              type="date"
              className="w-40"
              value={issuedTo}
              onChange={(e) => setIssuedTo(e.target.value)}
              title="Issued to"
            />
          </div>

          {loading ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Loading invoices…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No invoices match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Invoice #</th>
                    <th className="pb-3 px-4 font-medium">Customer</th>
                    <th className="pb-3 px-4 font-medium">Issue date</th>
                    <th className="pb-3 px-4 font-medium">Due date</th>
                    <th className="pb-3 px-4 font-medium">Status</th>
                    <th className="pb-3 px-4 font-medium text-right">Total</th>
                    <th className="pb-3 pl-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const draft = isDraftInvoice(inv);
                    return (
                      <tr key={inv.id} className="border-b border-muted">
                        <td className="py-3 pr-4 font-medium">
                          {inv.invoice_number || (
                            <span className="text-muted-foreground">Draft</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {customerMap.get(inv.customer_id ?? "") ?? "—"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {formatDate(inv.issue_date)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {formatDate(inv.due_date)}
                        </td>
                        <td className="py-3 px-4">
                          <InvoiceStatusBadge status={inv.status} />
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatMoney(inv.total)}
                        </td>
                        <td className="py-3 pl-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/invoices/${inv.id}`}>View</Link>
                            </Button>
                            {canEdit && draft && (
                              <>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/invoices/${inv.id}/edit`}>Edit</Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIssueTarget(inv)}
                                >
                                  Issue
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => setDeleteTarget(inv)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                            {INVOICE_PDF_AVAILABLE && !draft && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePdf(inv)}
                              >
                                PDF
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={issueTarget != null}
        title="Issue invoice?"
        description="This posts the invoice to the ledger. Continue?"
        confirmLabel="Issue"
        destructive
        loading={issuing}
        onCancel={() => setIssueTarget(null)}
        onConfirm={confirmIssue}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete draft invoice?"
        description="This permanently removes the draft. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
