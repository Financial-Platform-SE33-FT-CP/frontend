import { api } from "./api";

export interface JournalEntryLine {
  id: string;
  account_id: string;
  debit_amount: string;
  credit_amount: string;
  description: string;
}

export interface JournalEntry {
  id: string;
  tenant_id: string;
  entry_date: string;
  reference: string;
  description: string | null;
  source_type: string | null;
  is_reversal: boolean;
  created_at: string;
  lines: JournalEntryLine[];
}

export interface CreateJournalEntryLine {
  account_id: string;
  debit_amount: string;
  credit_amount: string;
  description: string;
}

export interface CreateJournalEntryPayload {
  entry_date: string;
  reference: string;
  description: string;
  lines: CreateJournalEntryLine[];
}

export interface JournalEntryListResponse {
  entries: JournalEntry[];
  count: number;
  offset: number;
  limit: number;
}

function ledgerUrl(path: string): string {
  const base = (
    process.env.NEXT_PUBLIC_LEDGER_SERVICE_URL ??
    process.env.NEXT_PUBLIC_LEDGER_URL ??
    "http://localhost:8003"
  ).trim();
  return `${base}${path}`;
}

async function ledgerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("acct_workspace_tenant_id") : null;
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant-ID"] = tenantId;

  const res = await fetch(ledgerUrl(path), { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function createJournalEntry(
  payload: CreateJournalEntryPayload
): Promise<JournalEntry> {
  return ledgerRequest<JournalEntry>("/ledger/journal-entries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getJournalEntry(id: string): Promise<JournalEntry> {
  return ledgerRequest<JournalEntry>(`/ledger/journal-entries/${id}`);
}

export function listJournalEntries(
  offset = 0,
  limit = 50
): Promise<JournalEntryListResponse> {
  return ledgerRequest<JournalEntryListResponse>(
    `/ledger/journal-entries?offset=${offset}&limit=${limit}`
  );
}
