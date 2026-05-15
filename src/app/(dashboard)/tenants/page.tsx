"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantTeamPanel } from "@/components/tenant/tenant-team-panel";
import { listTenants, type TenantDto } from "@/lib/tenant-api";
import { apiRoleLabel } from "@/lib/tenant-roles";
import {
  clearActiveTenant,
  getActiveTenantId,
  getWorkspaceUserId,
  setActiveTenant,
} from "@/lib/workspace-session";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const uid = getWorkspaceUserId();
    if (!uid) {
      setTenants([]);
      setActiveId(null);
      clearActiveTenant();
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listTenants();
      setTenants(rows);
      const stored = getActiveTenantId();
      const still = stored ? rows.find((t) => t.id === stored) : undefined;
      if (still) {
        setActiveId(still.id);
        setActiveTenant(still.id, still.current_user_role ?? "viewer");
      } else if (rows.length > 0) {
        const first = rows[0];
        setActiveId(first.id);
        setActiveTenant(first.id, first.current_user_role ?? "viewer");
      } else {
        setActiveId(null);
        clearActiveTenant();
      }
    } catch (e) {
      toast.error("Tenant service error", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onWs = () => void refresh();
    window.addEventListener("acct-workspace-change", onWs);
    return () => window.removeEventListener("acct-workspace-change", onWs);
  }, [refresh]);

  const active = tenants.find((t) => t.id === activeId) ?? null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
        </div>
        <Button asChild>
          <Link href="/tenants/setup">New company</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading tenants…</p>
      ) : tenants.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No companies yet</CardTitle>
            <CardDescription>Create one with the guided wizard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/tenants/setup">Start company setup</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Your companies</h2>
            <ul className="space-y-2">
              {tenants.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(t.id);
                      setActiveTenant(t.id, t.current_user_role ?? "viewer");
                    }}
                    className={`w-full rounded-lg border p-4 text-left text-sm transition-colors ${
                      t.id === activeId
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-semibold">{t.name}</div>
                    <div className="mt-2 text-xs">
                      Role: <strong>{apiRoleLabel(t.current_user_role ?? "")}</strong> · Currency:{" "}
                      {t.base_currency} · FY starts {t.fiscal_year_start_mmdd}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {active && (
            <div>
              <TenantTeamPanel tenantId={active.id} myRole={active.current_user_role} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
