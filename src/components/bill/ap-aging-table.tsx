"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { APAgingLine, Vendor } from "@/lib/ar-ap-api";
import { formatMoney } from "@/lib/format-money";

type Props = {
  lines: APAgingLine[];
  vendors: Vendor[];
  loading?: boolean;
};

export function ApAgingTable({ lines, vendors, loading }: Props) {
  const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));
  return (
    <Card>
      <CardHeader>
        <CardTitle>AP aging</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading aging…</p>
        ) : lines.length === 0 ? (
          <p className="text-muted-foreground">No outstanding payables.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Bill</th>
                  <th className="py-2 pr-4">Vendor</th>
                  <th className="py-2 pr-4">Due</th>
                  <th className="py-2 pr-4">Bucket</th>
                  <th className="py-2 pr-4 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((row) => (
                  <tr key={row.bill_id} className="border-b">
                    <td className="py-2 pr-4">
                      <Link href={`/bills/${row.bill_id}`} className="text-primary hover:underline">
                        {row.bill_number}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{vendorMap.get(row.vendor_id ?? "") ?? "—"}</td>
                    <td className="py-2 pr-4">{row.due_date ?? "—"}</td>
                    <td className="py-2 pr-4">{row.aging_bucket}</td>
                    <td className="py-2 pr-4 text-right">{formatMoney(row.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
