"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CreateCustomerRequest } from "@/lib/ar-ap-api";

type AddCustomerDialogProps = {
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateCustomerRequest) => void;
};

export function AddCustomerDialog({
  open,
  loading,
  onCancel,
  onSubmit,
}: AddCustomerDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creditTermsDays, setCreditTermsDays] = useState("");
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setCreditTermsDays("");
    }
  }, [open]);

  function readFieldValues(root: HTMLElement) {
    const nameEl = root.querySelector<HTMLInputElement>('[name="name"]');
    const emailEl = root.querySelector<HTMLInputElement>('[name="email"]');
    const termsEl = root.querySelector<HTMLInputElement>('[name="credit_terms_days"]');
    return {
      name: (nameEl?.value ?? "").trim(),
      email: (emailEl?.value ?? "").trim(),
      creditTermsDays: (termsEl?.value ?? "").trim(),
    };
  }

  function handleSave() {
    const root = panelRef.current;
    if (!root) return;

    const inputs = root.querySelectorAll<HTMLInputElement>("input");
    for (const input of inputs) {
      if (!input.checkValidity()) {
        input.reportValidity();
        return;
      }
    }

    const { name: trimmedName, email: trimmedEmail, creditTermsDays: terms } =
      readFieldValues(root);
    if (!trimmedName) return;

    const payload: CreateCustomerRequest = { name: trimmedName };
    if (trimmedEmail) payload.email = trimmedEmail;

    if (terms) {
      const days = parseInt(terms, 10);
      if (Number.isFinite(days) && days >= 0) {
        payload.credit_terms_days = days;
      }
    }

    onSubmit(payload);
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-customer-dialog-title"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          handleSave();
        }
      }}
    >
      <Card className="w-full max-w-md shadow-lg">
        <div ref={panelRef}>
          <CardHeader>
            <CardTitle id="add-customer-dialog-title">Add customer</CardTitle>
            <CardDescription>
              Create a customer for this invoice. Full customer management is not in scope.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="customer-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="customer-name"
                name="name"
                value={name}
                disabled={loading}
                onChange={(e) => setName(e.target.value)}
                onInput={(e) => setName(e.currentTarget.value)}
                autoComplete="organization"
                placeholder="Acme Pte Ltd"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="customer-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="customer-email"
                name="email"
                type="email"
                value={email}
                disabled={loading}
                onChange={(e) => setEmail(e.target.value)}
                onInput={(e) => setEmail(e.currentTarget.value)}
                autoComplete="email"
                placeholder="billing@example.com"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="customer-terms" className="text-sm font-medium">
                Credit terms (days)
              </label>
              <Input
                id="customer-terms"
                name="credit_terms_days"
                type="number"
                min="0"
                step="1"
                value={creditTermsDays}
                disabled={loading}
                onChange={(e) => setCreditTermsDays(e.target.value)}
                onInput={(e) => setCreditTermsDays(e.currentTarget.value)}
                autoComplete="off"
                placeholder="30"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
                Cancel
              </Button>
              <Button type="button" disabled={loading} onClick={handleSave}>
                {loading ? "Saving…" : "Add customer"}
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>,
    document.body,
  );
}
