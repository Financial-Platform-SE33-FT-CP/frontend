"use client";

import { useCallback, useEffect, useState } from "react";
import JournalEntryForm from "@/components/journal-entry/JournalEntryForm";
import JournalEntryList from "@/components/journal-entry/JournalEntryList";
import { listJournalEntries, type JournalEntry } from "@/lib/journal-entries";

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listJournalEntries(0, 50);
      setEntries(data.entries);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
        <p className="mt-2 text-muted-foreground">
          Post and view manual journal entries. All entries are immutable once posted.
        </p>
      </div>

      <JournalEntryForm onCreated={fetchEntries} />
      <JournalEntryList entries={entries} loading={loading} />
    </div>
  );
}
