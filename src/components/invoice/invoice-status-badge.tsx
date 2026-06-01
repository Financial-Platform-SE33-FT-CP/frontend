import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/ar-ap-api";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  issued: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  partial: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  overdue: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
  partial: "Partial",
  overdue: "Overdue",
};

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status as InvoiceStatus;
  const style = STATUS_STYLES[key] ?? STATUS_STYLES.draft;
  const label = STATUS_LABELS[key] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
