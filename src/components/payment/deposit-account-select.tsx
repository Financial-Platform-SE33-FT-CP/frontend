"use client";

import { useEffect, useState } from "react";
import { listCoaAccounts, type CoaAccount } from "@/lib/coa-api";

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

type DepositAccountSelectProps = {
  value: string;
  onChange: (accountId: string) => void;
  disabled?: boolean;
  id?: string;
};

export function DepositAccountSelect({
  value,
  onChange,
  disabled,
  id,
}: DepositAccountSelectProps) {
  const [accounts, setAccounts] = useState<CoaAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCoaAccounts()
      .then((data) =>
        setAccounts(
          data.filter((a) => a.is_active && a.account_type === "asset"),
        ),
      )
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <select
      id={id}
      className={selectClassName}
      value={value}
      disabled={disabled || loading}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">
        {loading ? "Loading accounts…" : "Select bank / cash account"}
      </option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.code} — {a.name}
        </option>
      ))}
    </select>
  );
}
