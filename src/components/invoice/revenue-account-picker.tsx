"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { listCoaAccounts, type CoaAccount } from "@/lib/coa-api";

type RevenueAccountPickerProps = {
  value: string;
  onChange: (accountId: string) => void;
  disabled?: boolean;
};

export function RevenueAccountPicker({
  value,
  onChange,
  disabled,
}: RevenueAccountPickerProps) {
  const [accounts, setAccounts] = useState<CoaAccount[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listCoaAccounts()
      .then((data) =>
        setAccounts(
          data.filter((a) => a.is_active && a.account_type === "revenue"),
        ),
      )
      .catch(() => setAccounts([]));
  }, []);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === value),
    [accounts, value],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q),
    );
  }, [accounts, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function select(account: CoaAccount) {
    onChange(account.id);
    setQuery("");
    setOpen(false);
    setHighlightIndex(-1);
  }

  const displayText = selectedAccount
    ? `${selectedAccount.code} - ${selectedAccount.name}`
    : "";

  return (
    <div ref={containerRef} className="relative min-w-[12rem]">
      <Input
        placeholder="Revenue account (code or name)"
        value={open ? query : displayText}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlightIndex(0);
        }}
        onFocus={() => {
          if (selectedAccount) setQuery("");
          setOpen(true);
        }}
        autoComplete="off"
      />
      {open && !disabled && (
        <ul className="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {accounts.length === 0
                ? "No revenue accounts — add accounts in Chart of Accounts"
                : "No matching accounts"}
            </li>
          ) : (
            filtered.map((account, idx) => (
              <li
                key={account.id}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  idx === highlightIndex
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onMouseEnter={() => setHighlightIndex(idx)}
                onClick={() => select(account)}
              >
                <span className="font-mono text-xs">{account.code}</span>
                <span className="mx-2 text-muted-foreground">-</span>
                <span>{account.name}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
