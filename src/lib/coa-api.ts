import { api } from "@/lib/api";
import { setTenantId } from "./auth";
import { getActiveTenantId } from "./workspace-session";

// Production (behind nginx): leave unset → relative path /api/coa, calls go through proxy.
// Local dev: set NEXT_PUBLIC_COA_SERVICE_URL=http://localhost:8003 in .env.local
const COA_BASE_URL =
  process.env.NEXT_PUBLIC_COA_SERVICE_URL ??
  process.env.NEXT_PUBLIC_COA_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "/api/coa";

function coaOpts() {
  const tenantId = getActiveTenantId();
  if (tenantId) {
    setTenantId(tenantId);
  }
  return { baseUrl: COA_BASE_URL };
}

export type AccountDto = {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  account_type: string;
  parent_id: string | null;
  is_active: boolean;
  is_system: boolean;
  description?: string | null;
  created_at: string;
  updated_at: string;
};

export type CoaAccount = AccountDto;

export type AccountTreeNodeDto = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  children: AccountTreeNodeDto[];
};

export type CreateAccountPayload = {
  code: string;
  name: string;
  account_type: string;
  parent_code?: string | null;
  description?: string | null;
};

export type UpdateAccountPayload = {
  name?: string;
  description?: string;
  is_active?: boolean;
};

export function listAccounts() {
  return api.get<AccountDto[]>("/coa/accounts", coaOpts());
}

export function listCoaAccounts(): Promise<CoaAccount[]> {
  return listAccounts().then((accounts) =>
    [...accounts].sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true }),
    ),
  );
}

export function getAccountTree() {
  return api.get<AccountTreeNodeDto[]>("/coa/accounts/tree", coaOpts());
}

export function seedDefaultAccounts() {
  return api.post<AccountDto[]>("/coa/accounts/seed", undefined, coaOpts());
}

export function createAccount(payload: CreateAccountPayload) {
  return api.post<AccountDto>("/coa/accounts", payload, coaOpts());
}

export function updateAccount(id: string, payload: UpdateAccountPayload) {
  return api.patch<AccountDto>(`/coa/accounts/${id}`, payload, coaOpts());
}

export function deactivateAccount(id: string) {
  return api.patch<AccountDto>(
    `/coa/accounts/${id}/deactivate`,
    undefined,
    coaOpts(),
  );
}
