"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadBankStatement, type BankTransaction } from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";

type Props = {
  bankAccountId: string;
  onUploaded: (txns: BankTransaction[]) => void;
};

export default function BankStatementUpload({
  bankAccountId,
  onUploaded,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState<number | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      setCsvContent(text);
      toast.success(`Loaded "${file.name}" (${text.length} bytes).`);
    } catch {
      toast.error("Failed to read file.");
    }
    // Reset so re-selecting the same file triggers onChange again
    e.target.value = "";
  }

  async function handleUpload() {
    if (!csvContent.trim()) {
      toast.error("Paste CSV content or select a .csv file first.");
      return;
    }
    setUploading(true);
    setUploadedCount(null);
    try {
      const result = await uploadBankStatement({
        bank_account_id: bankAccountId,
        csv_content: csvContent,
      });
      setUploadedCount(result.length);
      onUploaded(result);
      toast.success(`Uploaded ${result.length} transaction(s).`);
      setCsvContent("");
      setFileName(null);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="text-lg font-semibold">Upload Bank Statement (CSV)</h3>
      <p className="text-sm text-muted-foreground">
        Select a <code className="rounded bg-muted px-1">.csv</code> file or
        paste the content below. Supported formats:{" "}
        <code className="rounded bg-muted px-1">date,description,amount</code>{" "}
        or{" "}
        <code className="rounded bg-muted px-1">
          Date,Description,Debit,Credit
        </code>
        . Duplicate transactions are automatically skipped.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          {fileName ? `Change file… (${fileName})` : "Select CSV file…"}
        </Button>
        {fileName && (
          <span className="text-xs text-muted-foreground">{fileName}</span>
        )}
      </div>

      <textarea
        className="min-h-[200px] w-full rounded-md border bg-background p-3 font-mono text-sm"
        placeholder={`date,description,amount\n2026-04-01,Invoice payment,1090.00\n2026-04-02,Refund,-150.00`}
        value={csvContent}
        onChange={(e) => {
          setCsvContent(e.target.value);
          setFileName(null);
        }}
      />

      <div className="flex items-center gap-3">
        <Button onClick={handleUpload} disabled={uploading}>
          {uploading ? "Uploading…" : "Upload statement"}
        </Button>
        {uploadedCount !== null && (
          <span className="text-sm text-muted-foreground">
            {uploadedCount} transaction(s) created.
          </span>
        )}
      </div>
    </div>
  );
}
