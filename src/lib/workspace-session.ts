const USER_ID = "acct_workspace_user_id";
const TENANT_ID = "acct_workspace_tenant_id";
const TENANT_ROLE = "acct_workspace_tenant_role";

// This key is used by src/lib/api.ts to populate X-Tenant-ID.
const API_TENANT_ID = "tenant_id";

export function getWorkspaceUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_ID);
}

function notifyWorkspaceChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("acct-workspace-change"));
  }
}

export function setWorkspaceUserId(id: string): void {
  const next = id.trim();
  if (window.localStorage.getItem(USER_ID) === next) return;
  window.localStorage.setItem(USER_ID, next);
  notifyWorkspaceChange();
}

export function getActiveTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TENANT_ID) ??
  window.localStorage.getItem(API_TENANT_ID);
}

export function setActiveTenant(id: string, role: string): void {
  const prevId = window.localStorage.getItem(TENANT_ID);
  const prevRole = window.localStorage.getItem(TENANT_ROLE);
  if (prevId === id && prevRole === role) return;
  window.localStorage.setItem(TENANT_ID, id);
  window.localStorage.setItem(TENANT_ROLE, role);
  window.localStorage.setItem(API_TENANT_ID,id);
  notifyWorkspaceChange();
}

export function getActiveTenantRole(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TENANT_ROLE);
}

export function clearActiveTenant(): void {
  if (
    window.localStorage.getItem(TENANT_ID) == null &&
    window.localStorage.getItem(TENANT_ROLE) == null
  ) {
    return;
  }
  window.localStorage.removeItem(TENANT_ID);
  window.localStorage.removeItem(TENANT_ROLE);
  window.localStorage.removeItem(API_TENANT_ID);
  notifyWorkspaceChange();
}

/** Clears workspace user + active tenant (call on full logout). */
export function clearWorkspaceSession(): void {
  if (typeof window === "undefined") return;
  const hadUser = window.localStorage.getItem(USER_ID) != null;
  const hadTenant =
    window.localStorage.getItem(TENANT_ID) != null ||
    window.localStorage.getItem(TENANT_ROLE) != null;
  if (!hadUser && !hadTenant) return;
  window.localStorage.removeItem(USER_ID);
  window.localStorage.removeItem(TENANT_ID);
  window.localStorage.removeItem(TENANT_ROLE);
  window.localStorage.removeItem(API_TENANT_ID);
  notifyWorkspaceChange();
}
