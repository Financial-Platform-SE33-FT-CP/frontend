import { api } from "./api";
import { getActiveTenantId } from "./workspace-session";
import { setTenantId } from "./auth";

const base = () =>
  (process.env.NEXT_PUBLIC_AUDIT_SERVICE_URL ?? "/api/audit").replace(
    /\/$/,
    "",
  );

function auditOpts() {
  const tenantId = getActiveTenantId();
  if (tenantId) setTenantId(tenantId);
  return { baseUrl: base() };
}

export type AuditLogEntry = {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, unknown> | null;
  timestamp: string;
};

export type AuditLogListParams = {
  offset?: number;
  limit?: number;
  action?: string;
  entity_type?: string;
  from_date?: string;
  to_date?: string;
};

export type AuditLogListResponse = {
  items: AuditLogEntry[];
  count: number;
  offset: number;
  limit: number;
};

export async function listAuditLogs(
  params?: AuditLogListParams,
): Promise<AuditLogEntry[]> {
  const query: Record<string, string> = {};
  if (params?.offset !== undefined) query.offset = String(params.offset);
  if (params?.limit !== undefined) query.limit = String(params.limit);
  if (params?.action) query.action = params.action;
  if (params?.entity_type) query.entity_type = params.entity_type;
  if (params?.from_date) query.from_date = params.from_date;
  if (params?.to_date) query.to_date = params.to_date;

  const response = await api.get<AuditLogListResponse>("/audit/audit-logs", {
    ...auditOpts(),
    params: Object.keys(query).length ? query : undefined,
  });
  return response.items;
}

export async function getAuditLog(id: string): Promise<AuditLogEntry> {
  return api.get<AuditLogEntry>(`/audit/audit-logs/${id}`, auditOpts());
}
