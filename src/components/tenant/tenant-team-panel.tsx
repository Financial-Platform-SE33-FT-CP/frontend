"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addTenantMember,
  listTenantMembers,
  removeTenantMember,
  type TenantMemberDto,
} from "@/lib/tenant-api";
import {
  API_ROLE_OPTIONS,
  apiRoleLabel,
  canManageTeam,
  type TenantApiRole,
} from "@/lib/tenant-roles";
import { getWorkspaceUserId } from "@/lib/workspace-session";

type TenantTeamPanelProps = {
  tenantId: string;
  myRole: string | null;
};

export function TenantTeamPanel({ tenantId, myRole }: TenantTeamPanelProps) {
  const [members, setMembers] = useState<TenantMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<TenantApiRole>("viewer");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listTenantMembers(tenantId);
      setMembers(rows);
    } catch (e) {
      toast.error("Failed to load team", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const manage = canManageTeam(myRole);
  const selfId = getWorkspaceUserId();

  async function onAdd() {
    if (!newUserId.trim()) return;
    try {
      await addTenantMember(tenantId, newUserId.trim(), newRole);
      setNewUserId("");
      toast.success("Member invited");
      await load();
    } catch (e) {
      toast.error("Could not add member", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  async function onRemove(targetUserId: string) {
    try {
      await removeTenantMember(tenantId, targetUserId);
      toast.success("Member removed");
      await load();
    } catch (e) {
      toast.error("Could not remove member", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h2 className="text-lg font-semibold">Team & roles (US-3)</h2>
        <p className="text-sm text-muted-foreground">
          Roles are stored per tenant-user. API uses{" "}
          <code className="rounded bg-muted px-1">admin</code> /{" "}
          <code className="rounded bg-muted px-1">manager</code> /{" "}
          <code className="rounded bg-muted px-1">viewer</code> — mapped to Owner / Accountant /
          Viewer in the UI.
        </p>
      </div>

      {manage && (
        <div className="flex flex-col gap-2 rounded-md bg-muted/40 p-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium">User ID (UUID)</label>
            <Input
              className="font-mono text-xs"
              placeholder="Target user UUID"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
            />
          </div>
          <div className="w-full space-y-1 sm:w-40">
            <label className="text-xs font-medium">Role</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as TenantApiRole)}
            >
              {API_ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" className="sm:mb-0" onClick={() => void onAdd()}>
            Add member
          </Button>
        </div>
      )}

      {!manage && (
        <p className="text-sm text-muted-foreground">
          Only <strong>Owner</strong> can add or remove team members. Your role:{" "}
          <strong>{apiRoleLabel(myRole ?? "")}</strong>
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2 pr-2">User ID</th>
              <th className="py-2 pr-2">Role</th>
              {manage && <th className="py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="py-4 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-muted-foreground">
                  No members returned.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="border-b border-border/60">
                  <td className="py-2 pr-2 font-mono text-xs">{m.user_id}</td>
                  <td className="py-2 pr-2">
                    {apiRoleLabel(m.role)}
                    <span className="ml-1 text-xs text-muted-foreground">({m.role})</span>
                  </td>
                  {manage && (
                    <td className="py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={m.user_id === selfId}
                        onClick={() => void onRemove(m.user_id)}
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
