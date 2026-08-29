"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CreateVendorRequest } from "@/lib/ar-ap-api";

type AddVendorDialogProps = {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateVendorRequest) => void;
};

export function AddVendorDialog({
  open,
  loading,
  onCancel,
  onSubmit,
}: AddVendorDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
    }
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Add vendor</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Email (optional)</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || !name.trim()}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                email: email.trim() || null,
              })
            }
          >
            {loading ? "Saving…" : "Add vendor"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
