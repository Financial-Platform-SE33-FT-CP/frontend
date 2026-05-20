/** Maps tenant-service API roles (stored per tenant-user) to product labels (US-3). */
export type TenantApiRole = "admin" | "manager" | "viewer";

export const API_ROLE_OPTIONS: { value: TenantApiRole; label: string; description: string }[] = [
  {
    value: "admin",
    label: "Owner",
    description: "Full access: company settings, team, chart of accounts, postings.",
  },
  {
    value: "manager",
    label: "Accountant",
    description: "Operational access: post transactions, manage books (no team admin).",
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only: dashboards and reports; cannot post or change settings.",
  },
];

export function apiRoleLabel(role: string): string {
  const row = API_ROLE_OPTIONS.find((r) => r.value === role);
  return row?.label ?? role;
}

export function canManageTeam(role: string | null | undefined): boolean {
  return role === "admin";
}

export function canEditAccountingData(role: string | null | undefined): boolean {
  return role === "admin" || role === "manager";
}

export function canViewTenant(role: string | null | undefined): boolean {
  return role === "admin" || role === "manager" || role === "viewer";
}
