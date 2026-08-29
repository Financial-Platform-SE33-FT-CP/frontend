"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RoleGate } from "@/components/tenant/role-gate";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { useActiveTenantId } from "@/hooks/use-active-tenant";
import { canManageTeam, canViewTenant } from "@/lib/tenant-roles";
import { getCurrentPlan, changePlan, type PlanInfo } from "@/lib/billing-api";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

const PLAN_DETAILS: Record<
  string,
  { name: string; price: string; features: string[] }
> = {
  starter: {
    name: "Starter",
    price: "$29/mo",
    features: ["Basic reports", "Up to 3 users", "100 invoices/mo"],
  },
  growth: {
    name: "Growth",
    price: "$99/mo",
    features: [
      "Basic reports",
      "Approval workflow",
      "Cash forecasting",
      "API access",
      "Up to 10 users",
      "500 invoices/mo",
    ],
  },
  pro: {
    name: "Pro",
    price: "$199/mo",
    features: [
      "All Growth features",
      "Multi-entity",
      "Advanced analytics",
      "Unlimited users",
      "Unlimited invoices",
    ],
  },
};

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    trial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    past_due:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    canceled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    expired: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };
  return (
    <span
      className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.expired}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function BillingPage() {
  const role = useWorkspaceRole();
  const activeTenantId = useActiveTenantId();
  const canView = Boolean(activeTenantId) && canViewTenant(role);
  const canEdit = Boolean(activeTenantId) && canManageTeam(role);

  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    try {
      const nextPlan = await getCurrentPlan();
      if (currentRequestId === requestId.current) setPlan(nextPlan);
    } catch (err) {
      if (currentRequestId === requestId.current) {
        toast.error(formatApiError(err));
        setPlan(null);
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canView) {
      requestId.current += 1;
      setPlan(null);
      setLoading(false);
      return;
    }
    void load();
  }, [activeTenantId, canView, load]);

  async function handleUpgrade(tier: string) {
    setUpgrading(true);
    try {
      const result = await changePlan(tier);
      window.location.href = result.url;
    } catch (err) {
      toast.error(formatApiError(err));
      setUpgrading(false);
    }
  }

  const detail = plan
    ? (PLAN_DETAILS[plan.plan_tier] ?? PLAN_DETAILS.starter)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your plan and billing. Only <strong>Owner</strong> can change
          plans.
        </p>
      </div>

      <RoleGate
        allow={canView}
        fallback={
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Select a company on the Tenants page to view billing.
          </div>
        }
      >
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading…</div>
        ) : plan && detail ? (
          <>
            <div className="rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {detail.name} Plan
                    {statusBadge(plan.subscription_status)}
                  </h2>
                  <p className="mt-1 text-3xl font-bold">{detail.price}</p>
                  {plan.trial_ends_at &&
                    plan.subscription_status === "trial" && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Trial ends:{" "}
                        {new Date(plan.trial_ends_at).toLocaleDateString()}
                      </p>
                    )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">
                    Invoices this month
                  </p>
                  <p className="text-2xl font-bold">
                    {plan.usage.invoices_this_month}
                    {plan.usage.max_invoices !== null && (
                      <span className="text-base font-normal text-muted-foreground">
                        {" "}
                        / {plan.usage.max_invoices}
                      </span>
                    )}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Users</p>
                  <p className="text-2xl font-bold">
                    {plan.usage.users}
                    {plan.usage.max_users !== null && (
                      <span className="text-base font-normal text-muted-foreground">
                        {" "}
                        / {plan.usage.max_users}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <section>
              <h3 className="mb-3 text-lg font-semibold">Available Plans</h3>
              {!canEdit && (
                <p className="mb-3 text-sm text-muted-foreground">
                  Only an Owner can change the subscription plan.
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(PLAN_DETAILS).map(([tier, info]) => (
                  <div
                    key={tier}
                    className={`rounded-lg border p-4 ${
                      plan.plan_tier === tier ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <h4 className="font-semibold">{info.name}</h4>
                    <p className="mt-1 text-2xl font-bold">{info.price}</p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {info.features.map((f) => (
                        <li key={f}>✓ {f}</li>
                      ))}
                    </ul>
                    {canEdit && plan.plan_tier !== tier && (
                      <Button
                        className="mt-3 w-full"
                        disabled={upgrading}
                        onClick={() => handleUpgrade(tier)}
                      >
                        {tier === "starter" && plan.plan_tier !== "starter"
                          ? "Downgrade"
                          : plan.plan_tier === "starter" ||
                              (tier === "growth" &&
                                plan.plan_tier === "starter") ||
                              tier === "pro"
                            ? "Upgrade"
                            : "Switch"}
                      </Button>
                    )}
                    {plan.plan_tier === tier && (
                      <Button
                        className="mt-3 w-full"
                        variant="outline"
                        disabled
                      >
                        Current Plan
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Unable to load plan information.
          </div>
        )}
      </RoleGate>
    </div>
  );
}
