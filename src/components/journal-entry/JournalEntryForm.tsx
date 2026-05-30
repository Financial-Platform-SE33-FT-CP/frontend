"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AccountPicker } from "@/components/ui/account-picker";
import {
  createJournalEntry,
  type CreateJournalEntryLine,
} from "@/lib/journal-entries";

interface LineState {
  key: number;
  account_id: string;
  debit_amount: string;
  credit_amount: string;
  description: string;
}

function newLine(key: number): LineState {
  return { key, account_id: "", debit_amount: "", credit_amount: "", description: "" };
}

export default function JournalEntryForm({ onCreated }: { onCreated: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [entryDate, setEntryDate] = useState(today);
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineState[]>([newLine(0), newLine(1)]);
  const [nextKey, setNextKey] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  function updateLine(key: number, field: keyof LineState, value: string) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const updated = { ...line, [field]: value };
        if (field === "debit_amount" && value !== "") {
          updated.credit_amount = "";
        }
        if (field === "credit_amount" && value !== "") {
          updated.debit_amount = "";
        }
        return updated;
      })
    );
  }

  function addLine() {
    setLines((prev) => [...prev, newLine(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function removeLine(key: number) {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!reference.trim()) {
      toast.error("Reference is required.");
      return;
    }

    const filled = lines.filter(
      (l) => l.account_id || l.debit_amount || l.credit_amount
    );

    if (filled.length < 2) {
      toast.error("At least 2 lines with amounts are required.");
      return;
    }

    const missingAccount = filled.find((l) => !l.account_id.trim());
    if (missingAccount) {
      toast.error("Each line must have an account selected.");
      return;
    }

    const invalid = filled.find(
      (l) => (parseFloat(l.debit_amount) || 0) > 0 && (parseFloat(l.credit_amount) || 0) > 0
    );
    if (invalid) {
      toast.error("A line cannot have both debit and credit amounts.");
      return;
    }

    if (!isBalanced) {
      toast.error(
        `Entry is not balanced: debit ${totalDebit.toFixed(2)}, credit ${totalCredit.toFixed(2)}`
      );
      return;
    }

    const payloadLines: CreateJournalEntryLine[] = filled.map((l) => ({
      account_id: l.account_id,
      debit_amount: l.debit_amount || "0.00",
      credit_amount: l.credit_amount || "0.00",
      description: l.description,
    }));

    setSubmitting(true);
    try {
      await createJournalEntry({
        entry_date: entryDate,
        reference: reference.trim(),
        description,
        lines: payloadLines,
      });
      toast.success("Journal entry posted successfully.");
      setReference("");
      setDescription("");
      setLines([newLine(0), newLine(1)]);
      setNextKey(2);
      onCreated();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to post journal entry.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Journal Entry</CardTitle>
        <CardDescription>
          Post a manual journal entry. Debits must equal credits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Entry Date</label>
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Reference</label>
              <Input
                placeholder="JE-001"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Lines</span>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                + Add Line
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-2 font-medium">Account</th>
                    <th className="pb-2 px-2 font-medium w-28">Debit</th>
                    <th className="pb-2 px-2 font-medium w-28">Credit</th>
                    <th className="pb-2 pl-2 font-medium">Description</th>
                    <th className="pb-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key} className="border-b border-muted">
                      <td className="py-2 pr-2 min-w-[240px]">
                        <AccountPicker
                          value={line.account_id}
                          onChange={(accountId) => updateLine(line.key, "account_id", accountId)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={line.debit_amount}
                          onChange={(e) => updateLine(line.key, "debit_amount", e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={line.credit_amount}
                          onChange={(e) => updateLine(line.key, "credit_amount", e.target.value)}
                        />
                      </td>
                      <td className="py-2 pl-2">
                        <Input
                          placeholder="Description"
                          value={line.description}
                          onChange={(e) => updateLine(line.key, "description", e.target.value)}
                        />
                      </td>
                      <td className="py-2 text-center">
                        {lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeLine(line.key)}
                            className="text-muted-foreground hover:text-destructive text-lg leading-none"
                            title="Remove line"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end gap-8 border-t pt-3 text-sm">
              <div>
                <span className="text-muted-foreground">Total Debit: </span>
                <span className="font-mono font-semibold">{totalDebit.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Credit: </span>
                <span className="font-mono font-semibold">{totalCredit.toFixed(2)}</span>
              </div>
              <div>
                {isBalanced ? (
                  <span className="text-green-600 font-medium">Balanced</span>
                ) : (
                  <span className="text-destructive font-medium">
                    {totalDebit === 0 && totalCredit === 0
                      ? "Enter amounts"
                      : `Gap: ${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Posting..." : "Post Journal Entry"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
