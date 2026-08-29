"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { useActiveTenantId } from "@/hooks/use-active-tenant";
import { canViewTenant } from "@/lib/tenant-roles";
import {
  listAuditLogs,
  type AuditLogEntry,
  type AuditLogListParams,
} from "@/lib/audit-api";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const KNOWN_ACTIONS = [
  "created",
  "updated",
  "deleted",
  "reversed",
  "issued",
  "paid",
  "credited",
  "recorded",
  "matched",
  "unmatched",
  "member_added",
  "member_removed",
  "role_changed",
];

const KNOWN_ENTITIES = [
  "journal_entry",
  "invoice",
  "bill",
  "payment",
  "credit_note",
  "bank_transaction",
  "chart_of_accounts",
  "tenant",
];

export default function AuditTrailPage() {
  const role = useWorkspaceRole();
  const activeTenantId = useActiveTenantId();
  const canView = Boolean(activeTenantId) && canViewTenant(role);

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    try {
      const params: AuditLogListParams = { offset, limit };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity_type = entityFilter;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      const result = await listAuditLogs(params);
      if (currentRequestId === requestId.current) setLogs(result);
    } catch (err) {
      if (currentRequestId === requestId.current) {
        toast.error(formatApiError(err));
        setLogs([]);
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [offset, actionFilter, entityFilter, fromDate, toDate]);

  useEffect(() => {
    if (!canView) {
      requestId.current += 1;
      setLogs([]);
      setLoading(false);
      return;
    }
    void load();
  }, [activeTenantId, canView, load]);

  function applyFilters() {
    setOffset(0);
    setExpandedId(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
        <p className="mt-2 text-muted-foreground">
          View all changes and actions across the platform.
        </p>
      </div>

      <RoleGate
        allow={canView}
        fallback={
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Select a company on the Tenants page to view audit logs.
          </div>
        }
      >
        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All actions</option>
            {KNOWN_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">All entity types</option>
            {KNOWN_ENTITIES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-auto"
            placeholder="From"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-auto"
            placeholder="To"
          />
          <Button variant="outline" onClick={applyFilters}>
            Apply
          </Button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            No audit logs found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Entity Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Entity ID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <>
                      <tr
                        key={log.id}
                        className="cursor-pointer border-b hover:bg-muted/30"
                        onClick={() =>
                          setExpandedId(expandedId === log.id ? null : log.id)
                        }
                      >
                        <td className="px-4 py-3">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {log.user_id?.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">{log.entity_type}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {log.entity_id?.slice(0, 8)}…
                        </td>
                      </tr>
                      {expandedId === log.id && log.changes && (
                        <tr
                          key={`${log.id}-detail`}
                          className="border-b bg-muted/20"
                        >
                          <td colSpan={5} className="px-4 py-3">
                            <pre className="whitespace-pre-wrap text-xs">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={logs.length < limit}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </RoleGate>
    </div>
  );
}
