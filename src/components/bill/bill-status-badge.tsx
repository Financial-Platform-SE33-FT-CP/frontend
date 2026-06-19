import type { BillStatus } from "@/lib/ar-ap-api";

const LABELS: Record<BillStatus, string> = {
  draft: "Draft",
  open: "Open",
  partial: "Partially paid",
  paid: "Paid",
  void: "Void",
};

export function BillStatusBadge({ status }: { status: BillStatus }) {
  const colors: Record<BillStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    open: "bg-blue-100 text-blue-800",
    partial: "bg-amber-100 text-amber-900",
    paid: "bg-green-100 text-green-800",
    void: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}>
      {LABELS[status]}
    </span>
  );
}
