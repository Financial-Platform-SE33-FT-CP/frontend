"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "./input";
import { listCoaAccounts, type CoaAccount } from "@/lib/coa-api";

interface AccountPickerProps {
  value: string;
  onChange: (accountId: string) => void;
  placeholder?: string;
}

export function AccountPicker({
  value,
  onChange,
  placeholder = "Search account by code or name...",
}: AccountPickerProps) {
  const [accounts, setAccounts] = useState<CoaAccount[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listCoaAccounts()
      .then((data) => setAccounts(data.filter((a) => a.is_active)))
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
        a.name.toLowerCase().includes(q) ||
        `${a.code} - ${a.name}`.toLowerCase().includes(q),
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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        setHighlightIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          select(filtered[highlightIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        setQuery("");
        setHighlightIndex(-1);
        break;
    }
  }

  const displayText = selectedAccount
    ? `${selectedAccount.code} - ${selectedAccount.name}`
    : value || "";

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={open ? query : displayText}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlightIndex(0);
        }}
        onFocus={() => {
          if (selectedAccount) {
            setQuery("");
          }
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        autoComplete="off"
      />
      {selectedAccount && !open && (
        <input type="hidden" name="account_id" value={selectedAccount.id} />
      )}
      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-md"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {accounts.length === 0 ? "Loading accounts..." : "No matching accounts"}
            </li>
          ) : (
            filtered.map((account, idx) => (
              <li
                key={account.id}
                role="option"
                aria-selected={idx === highlightIndex}
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
