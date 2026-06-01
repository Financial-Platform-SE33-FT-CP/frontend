"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditNoteStatusBadge } from "@/components/credit-note/credit-note-status-badge";
import { getCreditNote, type CreditNote } from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format-money";

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

type CreditNoteHistoryTableProps = {
  creditNotes: CreditNote[];
  loading?: boolean;
};

function CreditNoteDetailDialog({
  creditNote,
  onClose,
}: {
  creditNote: CreditNote | null;
  onClose: () => void;
}) {
  if (!creditNote) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-note-detail-title"
    >
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle id="credit-note-detail-title">
              {creditNote.credit_note_number}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Issued {formatDate(creditNote.issue_date)}
            </p>
          </div>
          <CreditNoteStatusBadge status={creditNote.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          {creditNote.reason ? (
            <div>
              <p className="text-sm text-muted-foreground">Reason</p>
              <p className="text-sm">{creditNote.reason}</p>
            </div>
          ) : null}
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-mono">{formatMoney(creditNote.subtotal)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">GST</dt>
              <dd className="font-mono">{formatMoney(creditNote.gst_amount)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-mono font-semibold">
                {formatMoney(creditNote.total)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Journal entry</dt>
              <dd className="font-mono text-xs">
                {creditNote.journal_entry_id ? (
                  <Link
                    href="/journal-entries"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {creditNote.journal_entry_id}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
          {creditNote.lines && creditNote.lines.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium text-right">Qty</th>
                    <th className="px-3 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {creditNote.lines.map((line) => (
                    <tr key={line.id} className="border-b border-muted last:border-0">
                      <td className="px-3 py-2">{line.description || "—"}</td>
                      <td className="px-3 py-2 text-right font-mono">{line.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatMoney(
                          Number(line.line_total) + Number(line.gst_amount),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="flex justify-end border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CreditNoteHistoryTable({
  creditNotes,
  loading,
}: CreditNoteHistoryTableProps) {
  const [detail, setDetail] = useState<CreditNote | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  async function handleView(creditNote: CreditNote) {
    if (creditNote.lines && creditNote.lines.length > 0) {
      setDetail(creditNote);
      return;
    }
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const full = await getCreditNote(creditNote.id);
      setDetail(full);
    } catch (err) {
      setDetailError(formatApiError(err));
    } finally {
      setLoadingDetail(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Loading credit notes…
      </div>
    );
  }

  if (creditNotes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No credit notes issued yet.
      </div>
    );
  }

  return (
    <>
      {detailError ? (
        <div
          className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {detailError}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Credit note number</th>
              <th className="px-4 py-3 font-medium">Issue date</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium text-right">Subtotal</th>
              <th className="px-4 py-3 font-medium text-right">GST</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium">Journal entry</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {creditNotes.map((cn) => (
              <tr key={cn.id} className="border-b border-muted last:border-0">
                <td className="px-4 py-3 font-medium">{cn.credit_note_number}</td>
                <td className="px-4 py-3">{formatDate(cn.issue_date)}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-[12rem] truncate">
                  {cn.reason || "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatMoney(cn.subtotal)}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatMoney(cn.gst_amount)}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatMoney(cn.total)}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {cn.journal_entry_id ? (
                    <Link
                      href="/journal-entries"
                      className="text-primary underline-offset-4 hover:underline"
                      title="View journal entries"
                    >
                      {cn.journal_entry_id}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDateTime(cn.created_at)}
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={loadingDetail}
                    onClick={() => void handleView(cn)}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CreditNoteDetailDialog creditNote={detail} onClose={() => setDetail(null)} />
    </>
  );
}
