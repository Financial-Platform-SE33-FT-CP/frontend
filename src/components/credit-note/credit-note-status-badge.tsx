import { cn } from "@/lib/utils";
import type { CreditNoteStatus } from "@/lib/ar-ap-api";

const STATUS_STYLES: Record<CreditNoteStatus, string> = {
  issued: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  voided: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<CreditNoteStatus, string> = {
  issued: "Issued",
  voided: "Voided",
};

export function CreditNoteStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status as CreditNoteStatus;
  const style = STATUS_STYLES[key] ?? STATUS_STYLES.issued;
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
