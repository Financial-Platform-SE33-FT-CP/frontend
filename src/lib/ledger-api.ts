import { api, formatApiErrorBody } from "./api";
import { getToken, setTenantId } from "./auth";
import { getActiveTenantId } from "./workspace-session";
import type { JournalEntry } from "./journal-entries";

// Production (behind nginx): leave unset → relative path /api/ledger, calls go through proxy.
// Local dev: set NEXT_PUBLIC_LEDGER_SERVICE_URL=http://localhost:8003 in .env.local
const base = () =>
  (
    process.env.NEXT_PUBLIC_LEDGER_SERVICE_URL ?? "/api/ledger"
  ).replace(/\/$/, "");

function ledgerOpts() {
  const tenantId = getActiveTenantId();
  if (tenantId) {
    setTenantId(tenantId);
  }
  return { baseUrl: base() };
}

function requireLedgerSession(): { tenantId: string; token: string } {
  const tenantId = getActiveTenantId();
  if (!tenantId) {
    throw new Error("Select a company on the Tenants page first.");
  }
  setTenantId(tenantId);
  const token = getToken();
  if (!token) {
    throw new Error("Please sign in again — your session has expired.");
  }
  return { tenantId, token };
}

export type OpeningValidationError = {
  row: number | null;
  field: string;
  message: string;
};

export type OpeningImportPreview = {
  total_debit: string;
  total_credit: string;
  trial_balance_line_count: number;
  ar_aging_line_count: number;
  ap_aging_line_count: number;
  ar_aging_total: string;
  ap_aging_total: string;
};

export type OpeningValidateResponse = {
  valid: boolean;
  preview: OpeningImportPreview | null;
  errors: OpeningValidationError[];
};

export type OpeningImportResponse = {
  journal_entry_id: string;
  reference: string;
  entry_date: string;
  line_count: number;
  ar_documents_created: number;
  ap_documents_created: number;
  total_debit: string;
  total_credit: string;
};

export async function downloadOpeningBalanceTemplate(): Promise<Blob> {
  const { tenantId, token } = requireLedgerSession();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-Tenant-ID": tenantId,
  };
  const res = await fetch(`${base()}/ledger/opening-balance/template`, { headers });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new Error(formatApiErrorBody(body));
  }
  return res.blob();
}

export async function getOpeningBalanceStatus(): Promise<{ posted: boolean }> {
  return api.get<{ posted: boolean }>("/ledger/opening-balance/status", ledgerOpts());
}

export async function validateOpeningBalanceCsv(
  file: File,
): Promise<OpeningValidateResponse> {
  const form = new FormData();
  form.append("file", file);
  return api.post<OpeningValidateResponse>(
    "/ledger/opening-balance/validate",
    form,
    ledgerOpts(),
  );
}

export async function importOpeningBalanceCsv(
  file: File,
  entryDate: string,
  reference: string,
): Promise<OpeningImportResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("entry_date", entryDate);
  form.append("reference", reference);
  return api.post<OpeningImportResponse>(
    "/ledger/opening-balance/import",
    form,
    ledgerOpts(),
  );
}

// --- US-6: Ledger & Trial Balance read views ---

export type AccountLedgerTransaction = {
  journal_line_id: string;
  journal_entry_id: string;
  entry_date: string;
  reference: string;
  source_type: string | null;
  entry_description: string | null;
  line_description: string | null;
  debit_amount: string;
  credit_amount: string;
  running_balance: string;
};

export type AccountLedgerView = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  from_date: string | null;
  to_date: string | null;
  opening_balance: string;
  closing_balance: string;
  transactions: AccountLedgerTransaction[];
};

export type TrialBalanceAccount = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: string;
  total_credit: string;
  debit_balance: string;
  credit_balance: string;
};

export type TrialBalance = {
  as_of_date: string | null;
  accounts: TrialBalanceAccount[];
  total_debit_balance: string;
  total_credit_balance: string;
  is_balanced: boolean;
  imbalance: string;
};

export async function getTrialBalance(asOfDate?: string): Promise<TrialBalance> {
  const params: Record<string, string> = {};
  if (asOfDate) params.as_of_date = asOfDate;
  return api.get<TrialBalance>("/ledger/trial-balance", {
    ...ledgerOpts(),
    params: Object.keys(params).length ? params : undefined,
  });
}

export async function getAccountLedger(
  accountId: string,
  options?: { fromDate?: string; toDate?: string },
): Promise<AccountLedgerView> {
  const params: Record<string, string> = {};
  if (options?.fromDate) params.from_date = options.fromDate;
  if (options?.toDate) params.to_date = options.toDate;
  return api.get<AccountLedgerView>(`/ledger/accounts/${accountId}/transactions`, {
    ...ledgerOpts(),
    params: Object.keys(params).length ? params : undefined,
  });
}

// ── Accounting Periods ──────────────────────────────────────────

export type AccountingPeriod = {
  id: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_by: string | null;
  created_at: string;
};

export type CloseFiscalYearResult = {
  closing_journal_entry: JournalEntry | null;
  period_id: string;
  next_period: AccountingPeriod | null;
  message: string;
};

export async function listPeriods(): Promise<AccountingPeriod[]> {
  return api.get<AccountingPeriod[]>("/ledger/periods", ledgerOpts());
}

export async function getCurrentPeriod(): Promise<AccountingPeriod> {
  return api.get<AccountingPeriod>("/ledger/periods/current", ledgerOpts());
}

export async function closePeriod(
  periodId: string,
): Promise<CloseFiscalYearResult> {
  return api.post<CloseFiscalYearResult>(
    `/ledger/periods/${periodId}/close`,
    null,
    ledgerOpts(),
  );
}
