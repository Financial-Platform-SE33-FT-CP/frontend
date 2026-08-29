"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AddVendorDialog } from "@/components/bill/add-vendor-dialog";
import {
  createVendor,
  listVendors,
  type CreateVendorRequest,
  type Vendor,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";

type VendorSelectProps = {
  value: string;
  onChange: (vendorId: string) => void;
  disabled?: boolean;
};

export function VendorSelect({ value, onChange, disabled }: VendorSelectProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listVendors();
      setVendors([...data].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  async function handleCreateVendor(payload: CreateVendorRequest) {
    setCreating(true);
    try {
      const vendor = await createVendor(payload);
      setVendors((prev) =>
        [...prev, vendor].sort((a, b) => a.name.localeCompare(b.name)),
      );
      onChange(vendor.id);
      setDialogOpen(false);
      toast.success(`Vendor "${vendor.name}" added.`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <select
          className="flex h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={value}
          disabled={disabled || loading || creating}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">
            {loading ? "Loading vendors…" : "Select a vendor"}
          </option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.email ? ` (${v.email})` : ""}
            </option>
          ))}
        </select>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={loading || creating}
            onClick={() => setDialogOpen(true)}
          >
            Add vendor
          </Button>
        )}
      </div>
      <AddVendorDialog
        open={dialogOpen}
        loading={creating}
        onCancel={() => setDialogOpen(false)}
        onSubmit={(payload) => void handleCreateVendor(payload)}
      />
    </>
  );
}
