import { api, formatApiErrorBody } from "./api";
import { getToken, setTenantId } from "./auth";
import { getActiveTenantId } from "./workspace-session";

const base = () =>
  (
    process.env.NEXT_PUBLIC_LEDGER_SERVICE_URL ?? "http://127.0.0.1:8003"
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
