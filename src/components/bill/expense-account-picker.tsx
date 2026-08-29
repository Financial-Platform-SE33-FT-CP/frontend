"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { listCoaAccounts, type CoaAccount } from "@/lib/coa-api";

type ExpenseAccountPickerProps = {
  value: string;
  onChange: (accountId: string) => void;
  disabled?: boolean;
};

export function ExpenseAccountPicker({
  value,
  onChange,
  disabled,
}: ExpenseAccountPickerProps) {
  const [accounts, setAccounts] = useState<CoaAccount[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listCoaAccounts()
      .then((data) =>
        setAccounts(
          data.filter((a) => a.is_active && a.account_type === "expense"),
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
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder={selectedAccount ? `${selectedAccount.code} — ${selectedAccount.name}` : "Search expense account"}
        value={open ? query : selectedAccount ? `${selectedAccount.code} — ${selectedAccount.name}` : ""}
        disabled={disabled}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setHighlightIndex(-1);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlightIndex(-1);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && highlightIndex >= 0) {
            e.preventDefault();
            const picked = filtered[highlightIndex];
            if (picked) {
              onChange(picked.id);
              setOpen(false);
              setQuery("");
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md">
          {filtered.map((account, idx) => (
            <li key={account.id}>
              <button
                type="button"
                className={`w-full rounded px-2 py-1.5 text-left hover:bg-accent ${
                  idx === highlightIndex ? "bg-accent" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(account.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {account.code} — {account.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
