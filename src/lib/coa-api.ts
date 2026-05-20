import { api } from "@/lib/api";

const COA_BASE_URL =
  process.env.NEXT_PUBLIC_COA_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8003";

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
  return api.get<AccountDto[]>("/coa/accounts", {
    baseUrl: COA_BASE_URL,
  });
}

export function getAccountTree() {
  return api.get<AccountTreeNodeDto[]>("/coa/accounts/tree", {
    baseUrl: COA_BASE_URL,
  });
}

export function seedDefaultAccounts() {
  return api.post<AccountDto[]>("/coa/accounts/seed", undefined, {
    baseUrl: COA_BASE_URL,
  });
}

export function createAccount(payload: CreateAccountPayload) {
  return api.post<AccountDto>("/coa/accounts", payload, {
    baseUrl: COA_BASE_URL,
  });
}

export function updateAccount(id: string, payload: UpdateAccountPayload) {
  return api.patch<AccountDto>(`/coa/accounts/${id}`, payload, {
    baseUrl: COA_BASE_URL,
  });
}

export function deactivateAccount(id: string) {
  return api.patch<AccountDto>(`/coa/accounts/${id}/deactivate`, undefined, {
    baseUrl: COA_BASE_URL,
  });
}