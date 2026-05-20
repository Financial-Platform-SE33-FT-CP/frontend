import type { TenantApiRole } from "@/lib/tenant-roles";
import { getWorkspaceUserId } from "@/lib/workspace-session";

// Production (behind nginx): leave unset → relative path /api/tenants, calls go through proxy.
// Local dev: set NEXT_PUBLIC_TENANT_SERVICE_URL=http://localhost:8002 in .env.local
const base = () =>
  (process.env.NEXT_PUBLIC_TENANT_SERVICE_URL ?? "/api/tenants").replace(/\/$/, "");

function headers(json = false): HeadersInit {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  const uid = getWorkspaceUserId();
  if (uid) h["X-User-Id"] = uid;
  return h;
}

export type TenantDto = {
  id: string;
  name: string;
  slug: string;
  base_currency: string;
  fiscal_year_start_mmdd: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  current_user_role: string | null;
};

export type TenantMemberDto = {
  id: string;
  tenant_id: string;
  user_id: string;
  /** Present when using portal `/tenants/{id}/users`; member's auth email. */
  email: string;
  role: string;
  created_at: string;
};

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail)) return JSON.stringify(j.detail);
    return res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function listTenants(): Promise<TenantDto[]> {
  const res = await fetch(`${base()}/tenants/`, { headers: headers(false) });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<TenantDto[]>;
}

export async function createTenant(body: {
  name: string;
  slug: string;
  base_currency: string;
  fiscal_year_start_mmdd: string;
}): Promise<TenantDto> {
  const res = await fetch(`${base()}/tenants/`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({
      name: body.name,
      slug: body.slug,
      base_currency: body.base_currency.toUpperCase(),
      fiscal_year_start_mmdd: body.fiscal_year_start_mmdd,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<TenantDto>;
}

export async function listTenantMembers(tenantId: string): Promise<TenantMemberDto[]> {
  const res = await fetch(`${base()}/tenants/${tenantId}/users`, { headers: headers(false) });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<TenantMemberDto[]>;
}

export async function addTenantMember(
  tenantId: string,
  email: string,
  role: TenantApiRole,
): Promise<TenantMemberDto> {
  const res = await fetch(`${base()}/tenants/${tenantId}/users`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<TenantMemberDto>;
}

export async function removeTenantMember(tenantId: string, targetUserId: string): Promise<void> {
  const res = await fetch(`${base()}/tenants/${tenantId}/users/${targetUserId}`, {
    method: "DELETE",
    headers: headers(false),
  });
  if (!res.ok) throw new Error(await parseError(res));
}
