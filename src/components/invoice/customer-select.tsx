"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AddCustomerDialog } from "@/components/invoice/add-customer-dialog";
import {
  createCustomer,
  listCustomers,
  type CreateCustomerRequest,
  type Customer,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";

type CustomerSelectProps = {
  value: string;
  onChange: (customerId: string) => void;
  disabled?: boolean;
};

export function CustomerSelect({ value, onChange, disabled }: CustomerSelectProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCustomers();
      setCustomers([...data].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  async function handleCreateCustomer(payload: CreateCustomerRequest) {
    setCreating(true);
    try {
      const customer = await createCustomer(payload);
      setCustomers((prev) =>
        [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)),
      );
      onChange(customer.id);
      setDialogOpen(false);
      toast.success(`Customer "${customer.name}" added.`);
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
            {loading ? "Loading customers…" : "Select a customer"}
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.email ? ` (${c.email})` : ""}
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
            Add customer
          </Button>
        )}
      </div>

      <AddCustomerDialog
        open={dialogOpen}
        loading={creating}
        onCancel={() => setDialogOpen(false)}
        onSubmit={(payload) => void handleCreateCustomer(payload)}
      />
    </>
  );
}
