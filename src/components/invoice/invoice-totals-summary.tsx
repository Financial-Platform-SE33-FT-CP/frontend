import { formatMoney } from "@/lib/format-money";
import type { InvoiceTotalsPreview } from "@/lib/invoice-calc";

type Props = {
  preview: InvoiceTotalsPreview;
  /** Backend totals after save/load — shown when provided */
  backend?: {
    subtotal: string | number;
    gst_amount: string | number;
    total: string | number;
  };
  hint?: string;
};

export function InvoiceTotalsSummary({ preview, backend, hint }: Props) {
  const subtotal = backend?.subtotal ?? preview.subtotal;
  const gst = backend?.gst_amount ?? preview.gst_amount;
  const total = backend?.total ?? preview.total;

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <h3 className="mb-3 text-sm font-semibold">Totals</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-mono">{formatMoney(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">GST</dt>
          <dd className="font-mono">{formatMoney(gst)}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 font-medium">
          <dt>Total</dt>
          <dd className="font-mono">{formatMoney(total)}</dd>
        </div>
      </dl>
      {hint && (
        <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
      )}
      {!backend && (
        <p className="mt-2 text-xs text-muted-foreground">
          Preview only — final amounts are confirmed by the server when you save.
        </p>
      )}
    </div>
  );
}
