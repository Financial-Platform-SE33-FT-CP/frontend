"use client";

import { PAYMENT_METHOD_OPTIONS, type PaymentMethod } from "@/lib/ar-ap-api";

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

type PaymentMethodSelectProps = {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  disabled?: boolean;
  id?: string;
};

export function PaymentMethodSelect({
  value,
  onChange,
  disabled,
  id,
}: PaymentMethodSelectProps) {
  return (
    <select
      id={id}
      className={selectClassName}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as PaymentMethod)}
    >
      {PAYMENT_METHOD_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
