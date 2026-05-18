"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { JournalEntry } from "@/lib/journal-entries";

interface Props {
  entries: JournalEntry[];
  loading: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function JournalEntryList({ entries, loading }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal Entries</CardTitle>
        <CardDescription>
          Recent manual journal entries for this tenant.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            No journal entries yet. Create one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 px-4 font-medium">Reference</th>
                  <th className="pb-3 px-4 font-medium text-right">Debit</th>
                  <th className="pb-3 px-4 font-medium text-right">Credit</th>
                  <th className="pb-3 pl-4 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const totalDebit = entry.lines.reduce(
                    (s, l) => s + parseFloat(l.debit_amount), 0
                  );
                  const totalCredit = entry.lines.reduce(
                    (s, l) => s + parseFloat(l.credit_amount), 0
                  );
                  return (
                    <tr key={entry.id} className="border-b border-muted">
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {formatDate(entry.entry_date)}
                      </td>
                      <td className="py-3 px-4 font-medium">{entry.reference}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {totalDebit.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {totalCredit.toFixed(2)}
                      </td>
                      <td className="py-3 pl-4 text-muted-foreground max-w-60 truncate">
                        {entry.description || "—"}
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
  );
}
