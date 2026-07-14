"use client";

import type { GstCode, GstKind } from "@/lib/ar-ap-api";

type GstCodeSelectProps = {
  value: string;
  codes: GstCode[];
  allowedKinds: GstKind[];
  disabled?: boolean;
  onChange: (code: GstCode | null) => void;
};

export function GstCodeSelect({
  value,
  codes,
  allowedKinds,
  disabled = false,
  onChange,
}: GstCodeSelectProps) {
  const options = codes.filter(
    (code) => code.is_active && allowedKinds.includes(code.gst_kind),
  );

  return (
    <select
      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      value={value}
      disabled={disabled}
      onChange={(event) => {
        const selected =
          options.find((code) => code.id === event.target.value) ?? null;
        onChange(selected);
      }}
    >
      <option value="">No GST</option>

      {options.map((code) => (
        <option key={code.id} value={code.id}>
          {code.code} — {Number(code.rate) * 100}%
        </option>
      ))}
    </select>
  );
}
